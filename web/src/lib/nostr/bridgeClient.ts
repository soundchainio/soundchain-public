/**
 * SoundChain Bridge Client
 *
 * Connects SoundChain web app to native Bluetooth mesh via companion app.
 * Falls back to Nostr relays when bridge app is not available.
 *
 * Architecture:
 * - Web app connects to localhost:8765 WebSocket
 * - Native bridge app handles Bluetooth mesh
 * - Messages bridge between web ↔ Bluetooth ↔ Bitchat
 *
 * @author SoundChain Team
 * @patent-pending Bridge Protocol for Web-to-Native Mesh Communication
 */

import {
  subscribeToConcertChat,
  sendConcertMessage,
  getOrCreateIdentity,
  type NostrMessage,
  type NostrIdentity
} from './concertChat'

// Bridge connection config
const BRIDGE_PORT = 8765
const BRIDGE_HOST = 'localhost'
const BRIDGE_URL = `ws://${BRIDGE_HOST}:${BRIDGE_PORT}`
const BRIDGE_RECONNECT_INTERVAL = 5000
const BRIDGE_CONNECT_TIMEOUT = 3000

// Message types for bridge protocol
export enum BridgeMessageType {
  // Connection
  HANDSHAKE = 'handshake',
  HANDSHAKE_ACK = 'handshake_ack',
  PING = 'ping',
  PONG = 'pong',

  // Chat
  CHAT_MESSAGE = 'chat_message',
  CHAT_RECEIVED = 'chat_received',

  // Mesh status
  MESH_STATUS = 'mesh_status',
  NEARBY_DEVICES = 'nearby_devices',
  DEVICE_JOINED = 'device_joined',
  DEVICE_LEFT = 'device_left',

  // Errors
  ERROR = 'error'
}

export interface BridgeMessage {
  type: BridgeMessageType
  payload: any
  timestamp: number
  id: string
}

export interface NearbyDevice {
  id: string
  name: string
  rssi: number // Signal strength
  lastSeen: number
  isBitchat: boolean
}

export interface MeshStatus {
  isConnected: boolean
  bluetoothEnabled: boolean
  deviceCount: number
  devices: NearbyDevice[]
}

export type ConnectionMode = 'bridge' | 'nostr' | 'disconnected'

export interface BridgeClientConfig {
  geohash: string
  onMessage: (msg: NostrMessage) => void
  onMeshStatus?: (status: MeshStatus) => void
  onDeviceFound?: (device: NearbyDevice) => void
  onConnectionModeChange?: (mode: ConnectionMode) => void
}

/**
 * Bridge Client - Manages connection to native bridge app
 * Falls back to Nostr relays when bridge is unavailable
 */
export class BridgeClient {
  private ws: WebSocket | null = null
  private config: BridgeClientConfig
  private identity: NostrIdentity
  private connectionMode: ConnectionMode = 'disconnected'
  private reconnectTimer: NodeJS.Timeout | null = null
  private nostrSubscription: { close: () => void } | null = null
  private messageQueue: BridgeMessage[] = []
  private isConnecting = false

  constructor(config: BridgeClientConfig) {
    this.config = config
    this.identity = getOrCreateIdentity(config.geohash)
  }

  /**
   * Initialize connection - tries bridge first, falls back to Nostr
   */
  async connect(): Promise<ConnectionMode> {
    console.log('🌉 Bridge: Attempting connection...')

    // Try bridge first
    const bridgeConnected = await this.tryBridgeConnection()

    if (bridgeConnected) {
      this.setConnectionMode('bridge')
      console.log('🌉 Bridge: Connected to native app!')
      return 'bridge'
    }

    // Fall back to Nostr
    console.log('🌉 Bridge: Native app not found, falling back to Nostr relays')
    this.connectNostr()
    this.setConnectionMode('nostr')
    return 'nostr'
  }

  /**
   * Try to connect to bridge app via WebSocket
   */
  private async tryBridgeConnection(): Promise<boolean> {
    if (this.isConnecting) return false
    this.isConnecting = true

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('🌉 Bridge: Connection timeout')
        this.isConnecting = false
        resolve(false)
      }, BRIDGE_CONNECT_TIMEOUT)

      try {
        this.ws = new WebSocket(BRIDGE_URL)

        this.ws.onopen = () => {
          clearTimeout(timeout)
          console.log('🌉 Bridge: WebSocket connected')
          this.sendHandshake()
        }

        this.ws.onmessage = (event) => {
          this.handleBridgeMessage(event.data)
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeout)
          console.log('🌉 Bridge: WebSocket error', error)
          this.isConnecting = false
          resolve(false)
        }

        this.ws.onclose = () => {
          console.log('🌉 Bridge: WebSocket closed')
          if (this.connectionMode === 'bridge') {
            this.handleBridgeDisconnect()
          }
          this.isConnecting = false
        }

        // Wait for handshake ack
        const checkHandshake = setInterval(() => {
          if (this.connectionMode === 'bridge') {
            clearInterval(checkHandshake)
            clearTimeout(timeout)
            this.isConnecting = false
            resolve(true)
          }
        }, 100)

        // Timeout the handshake check
        setTimeout(() => {
          clearInterval(checkHandshake)
        }, BRIDGE_CONNECT_TIMEOUT)

      } catch (error) {
        clearTimeout(timeout)
        console.log('🌉 Bridge: Failed to create WebSocket', error)
        this.isConnecting = false
        resolve(false)
      }
    })
  }

  /**
   * Send handshake to bridge app
   */
  private sendHandshake() {
    this.sendBridgeMessage({
      type: BridgeMessageType.HANDSHAKE,
      payload: {
        version: '1.0.0',
        geohash: this.config.geohash,
        pubkey: this.identity.publicKey,
        client: 'soundchain-web'
      },
      timestamp: Date.now(),
      id: this.generateId()
    })
  }

  /**
   * Handle incoming bridge messages
   */
  private handleBridgeMessage(data: string) {
    try {
      const message: BridgeMessage = JSON.parse(data)
      console.log('🌉 Bridge: Received', message.type)

      switch (message.type) {
        case BridgeMessageType.HANDSHAKE_ACK:
          this.setConnectionMode('bridge')
          // Send any queued messages
          this.flushMessageQueue()
          break

        case BridgeMessageType.CHAT_RECEIVED:
          // Message received from Bluetooth mesh
          const nostrMsg: NostrMessage = {
            id: message.payload.id || this.generateId(),
            content: message.payload.content,
            pubkey: message.payload.pubkey,
            timestamp: message.payload.timestamp || Math.floor(Date.now() / 1000),
            geohash: message.payload.geohash || this.config.geohash,
            tags: message.payload.tags || []
          }
          this.config.onMessage(nostrMsg)
          break

        case BridgeMessageType.MESH_STATUS:
          this.config.onMeshStatus?.(message.payload as MeshStatus)
          break

        case BridgeMessageType.DEVICE_JOINED:
        case BridgeMessageType.NEARBY_DEVICES:
          if (message.payload.device) {
            this.config.onDeviceFound?.(message.payload.device as NearbyDevice)
          }
          break

        case BridgeMessageType.PONG:
          // Keep-alive acknowledged
          break

        case BridgeMessageType.ERROR:
          console.error('🌉 Bridge: Error from native app', message.payload)
          break
      }
    } catch (error) {
      console.error('🌉 Bridge: Failed to parse message', error)
    }
  }

  /**
   * Connect to Nostr relays (fallback mode)
   */
  private connectNostr() {
    if (this.nostrSubscription) {
      this.nostrSubscription.close()
    }

    this.nostrSubscription = subscribeToConcertChat(
      this.config.geohash,
      this.config.onMessage
    )
  }

  /**
   * Handle bridge disconnection - switch to Nostr
   */
  private handleBridgeDisconnect() {
    console.log('🌉 Bridge: Disconnected, switching to Nostr')
    this.setConnectionMode('nostr')
    this.connectNostr()

    // Try to reconnect to bridge
    this.scheduleReconnect()
  }

  /**
   * Schedule reconnection attempt to bridge
   */
  private scheduleReconnect() {
    if (this.reconnectTimer) return

    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null
      const connected = await this.tryBridgeConnection()
      if (connected) {
        // Switch back to bridge mode
        this.nostrSubscription?.close()
        this.nostrSubscription = null
        this.setConnectionMode('bridge')
      } else {
        // Try again later
        this.scheduleReconnect()
      }
    }, BRIDGE_RECONNECT_INTERVAL)
  }

  /**
   * Send a chat message
   */
  async sendMessage(content: string): Promise<boolean> {
    if (this.connectionMode === 'bridge' && this.ws?.readyState === WebSocket.OPEN) {
      // Send via bridge to Bluetooth mesh
      this.sendBridgeMessage({
        type: BridgeMessageType.CHAT_MESSAGE,
        payload: {
          content,
          geohash: this.config.geohash,
          pubkey: this.identity.publicKey,
          timestamp: Math.floor(Date.now() / 1000)
        },
        timestamp: Date.now(),
        id: this.generateId()
      })
      return true
    } else if (this.connectionMode === 'nostr') {
      // Send via Nostr relays
      try {
        await sendConcertMessage(this.identity, this.config.geohash, content)
        return true
      } catch (error) {
        console.error('🌉 Bridge: Failed to send via Nostr', error)
        return false
      }
    }

    return false
  }

  /**
   * Send message to bridge app
   */
  private sendBridgeMessage(message: BridgeMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      // Queue message for when connection is established
      this.messageQueue.push(message)
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()
      if (message) {
        this.sendBridgeMessage(message)
      }
    }
  }

  /**
   * Set connection mode and notify listeners
   */
  private setConnectionMode(mode: ConnectionMode) {
    if (this.connectionMode !== mode) {
      this.connectionMode = mode
      this.config.onConnectionModeChange?.(mode)
    }
  }

  /**
   * Get current connection mode
   */
  getConnectionMode(): ConnectionMode {
    return this.connectionMode
  }

  /**
   * Check if connected via bridge (Bluetooth available)
   */
  isBridgeConnected(): boolean {
    return this.connectionMode === 'bridge'
  }

  /**
   * Request mesh status from bridge
   */
  requestMeshStatus() {
    if (this.connectionMode === 'bridge') {
      this.sendBridgeMessage({
        type: BridgeMessageType.MESH_STATUS,
        payload: {},
        timestamp: Date.now(),
        id: this.generateId()
      })
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    if (this.nostrSubscription) {
      this.nostrSubscription.close()
      this.nostrSubscription = null
    }

    this.setConnectionMode('disconnected')
  }

  /**
   * Generate unique message ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }
}

/**
 * Check if bridge app is available (quick check)
 */
export async function isBridgeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(false), 1000)

    try {
      const ws = new WebSocket(BRIDGE_URL)
      ws.onopen = () => {
        clearTimeout(timeout)
        ws.close()
        resolve(true)
      }
      ws.onerror = () => {
        clearTimeout(timeout)
        resolve(false)
      }
    } catch {
      clearTimeout(timeout)
      resolve(false)
    }
  })
}

/**
 * Bridge Protocol Specification (for native app implementation)
 *
 * WebSocket server runs on localhost:8765
 *
 * Message format:
 * {
 *   type: BridgeMessageType,
 *   payload: any,
 *   timestamp: number,
 *   id: string
 * }
 *
 * Handshake flow:
 * 1. Web → Bridge: HANDSHAKE { version, geohash, pubkey, client }
 * 2. Bridge → Web: HANDSHAKE_ACK { version, bluetoothEnabled, deviceCount }
 *
 * Chat flow:
 * 1. Web → Bridge: CHAT_MESSAGE { content, geohash, pubkey }
 * 2. Bridge broadcasts via Bluetooth mesh
 * 3. Bridge → Web: CHAT_RECEIVED { content, pubkey, timestamp, source: 'bluetooth' }
 *
 * Mesh status:
 * 1. Web → Bridge: MESH_STATUS {}
 * 2. Bridge → Web: MESH_STATUS { isConnected, bluetoothEnabled, deviceCount, devices }
 */
