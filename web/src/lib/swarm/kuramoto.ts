/**
 * Kuramoto Oscillator Model for Swarm Music
 *
 * Based on the Kuramoto model for coupled oscillators:
 * dθᵢ/dt = ωᵢ + (K/N) Σⱼ sin(θⱼ - θᵢ)
 *
 * Where:
 * - θᵢ is the phase of oscillator i
 * - ωᵢ is the natural frequency of oscillator i
 * - K is the coupling strength
 * - N is the number of oscillators
 *
 * References:
 * - https://github.com/fabridamicelli/kuramoto
 * - https://github.com/serre-lab/KuraNet
 */

import { KuramotoState, SwarmAgent, AgentRole } from './types';

// Musical frequency ranges for each role (in abstract units, mapped to octaves)
const ROLE_FREQUENCY_RANGES: Record<AgentRole, [number, number]> = {
  bass: [0.5, 1.0],      // Slow, foundational
  drums: [1.0, 2.0],     // Rhythmic, steady
  pad: [0.3, 0.8],       // Very slow, atmospheric
  melody: [1.5, 3.0],    // Medium-fast, melodic
  lead: [2.0, 4.0],      // Fast, attention-grabbing
  arp: [3.0, 6.0],       // Very fast, arpeggiated
  fx: [0.1, 5.0],        // Variable, effects
};

// Default coupling weights by role (how much they follow others)
const ROLE_COUPLING_WEIGHTS: Record<AgentRole, number> = {
  drums: 0.3,   // Drums are the foundation, less influenced
  bass: 0.5,   // Bass follows drums closely
  pad: 0.7,    // Pads blend with everything
  melody: 0.8, // Melody adapts to harmony
  lead: 0.6,   // Lead has some independence
  arp: 0.9,    // Arp tightly synced
  fx: 0.4,     // FX more independent
};

export class KuramotoEngine {
  private N: number;                    // Number of oscillators (agents)
  private K: number;                    // Coupling strength
  private phases: number[];             // Current phases
  private naturalFrequencies: number[]; // ωᵢ for each oscillator
  private couplingWeights: number[];    // Individual coupling weights
  private dt: number = 0.01;            // Time step
  private history: KuramotoState[] = [];
  private step: number = 0;

  constructor(agents: SwarmAgent[], couplingStrength: number = 2.0) {
    this.N = agents.length;
    this.K = couplingStrength;

    // Initialize phases randomly (0 to 2π)
    this.phases = agents.map(() => Math.random() * 2 * Math.PI);

    // Assign natural frequencies based on role
    this.naturalFrequencies = agents.map(agent => {
      const [min, max] = ROLE_FREQUENCY_RANGES[agent.role];
      // Add some randomness within the role's range
      return min + Math.random() * (max - min);
    });

    // Assign coupling weights
    this.couplingWeights = agents.map(agent =>
      agent.coupling_weight ?? ROLE_COUPLING_WEIGHTS[agent.role]
    );

    // Record initial state
    this.recordState();
  }

  /**
   * Calculate the Kuramoto order parameter r
   * r ∈ [0, 1] where 1 = fully synchronized, 0 = desynchronized
   */
  getSyncOrder(): number {
    const realPart = this.phases.reduce((sum, θ) => sum + Math.cos(θ), 0) / this.N;
    const imagPart = this.phases.reduce((sum, θ) => sum + Math.sin(θ), 0) / this.N;
    return Math.sqrt(realPart * realPart + imagPart * imagPart);
  }

  /**
   * Calculate the mean phase φ
   */
  getMeanPhase(): number {
    const realPart = this.phases.reduce((sum, θ) => sum + Math.cos(θ), 0) / this.N;
    const imagPart = this.phases.reduce((sum, θ) => sum + Math.sin(θ), 0) / this.N;
    return Math.atan2(imagPart, realPart);
  }

  /**
   * Perform one Kuramoto integration step using Euler method
   * dθᵢ/dt = ωᵢ + (K/N) Σⱼ wᵢ sin(θⱼ - θᵢ)
   */
  evolve(steps: number = 1): void {
    for (let s = 0; s < steps; s++) {
      const newPhases = new Array(this.N);

      for (let i = 0; i < this.N; i++) {
        // Calculate coupling term
        let coupling = 0;
        for (let j = 0; j < this.N; j++) {
          if (i !== j) {
            coupling += Math.sin(this.phases[j] - this.phases[i]);
          }
        }
        coupling *= (this.K / this.N) * this.couplingWeights[i];

        // Euler integration
        const dθ = this.naturalFrequencies[i] + coupling;
        newPhases[i] = this.phases[i] + dθ * this.dt;

        // Keep phase in [0, 2π]
        newPhases[i] = newPhases[i] % (2 * Math.PI);
        if (newPhases[i] < 0) newPhases[i] += 2 * Math.PI;
      }

      this.phases = newPhases;
      this.step++;
      this.recordState();
    }
  }

  /**
   * Evolve until target synchronization is reached or max steps
   */
  evolveUntilSync(targetSync: number = 0.9, maxSteps: number = 10000): number {
    let stepsToSync = 0;

    while (this.getSyncOrder() < targetSync && stepsToSync < maxSteps) {
      this.evolve(10); // Evolve 10 steps at a time for efficiency
      stepsToSync += 10;
    }

    return stepsToSync;
  }

  /**
   * Record current state to history
   */
  private recordState(): void {
    this.history.push({
      step: this.step,
      phases: [...this.phases],
      sync_order: this.getSyncOrder(),
      mean_phase: this.getMeanPhase(),
      phase_velocities: this.getPhaseVelocities(),
    });
  }

  /**
   * Get current phase velocities (useful for note timing)
   */
  getPhaseVelocities(): number[] {
    if (this.history.length < 2) {
      return this.naturalFrequencies;
    }
    const prev = this.history[this.history.length - 2].phases;
    return this.phases.map((θ, i) => {
      let dθ = θ - prev[i];
      // Handle wraparound
      if (dθ > Math.PI) dθ -= 2 * Math.PI;
      if (dθ < -Math.PI) dθ += 2 * Math.PI;
      return dθ / this.dt;
    });
  }

  /**
   * Get phases for all oscillators
   */
  getPhases(): number[] {
    return [...this.phases];
  }

  /**
   * Get natural frequency for an oscillator
   */
  getNaturalFrequency(index: number): number {
    return this.naturalFrequencies[index];
  }

  /**
   * Get current state
   */
  getCurrentState(): KuramotoState {
    return this.history[this.history.length - 1];
  }

  /**
   * Get full history
   */
  getHistory(): KuramotoState[] {
    return this.history;
  }

  /**
   * Get sync order history (for visualization)
   */
  getSyncHistory(): number[] {
    return this.history.map(s => s.sync_order);
  }

  /**
   * Sample phases at regular intervals (for music generation)
   * Returns phases at each "beat" based on tempo
   */
  sampleAtBeats(tempo: number, bars: number, beatsPerBar: number = 4): number[][] {
    const totalBeats = bars * beatsPerBar;
    const secondsPerBeat = 60 / tempo;
    const stepsPerBeat = Math.floor(secondsPerBeat / this.dt);

    const samples: number[][] = [];

    // Reset to start
    this.step = 0;
    this.history = [];
    this.phases = this.phases.map(() => Math.random() * 2 * Math.PI);
    this.recordState();

    for (let beat = 0; beat < totalBeats; beat++) {
      samples.push([...this.phases]);
      this.evolve(stepsPerBeat);
    }

    return samples;
  }

  /**
   * Set coupling strength dynamically
   */
  setCouplingStrength(K: number): void {
    this.K = K;
  }

  /**
   * Get statistics about the synchronization
   */
  getStats(): {
    initial_sync: number;
    final_sync: number;
    mean_sync: number;
    max_sync: number;
    steps: number;
  } {
    const syncValues = this.getSyncHistory();
    return {
      initial_sync: syncValues[0] ?? 0,
      final_sync: syncValues[syncValues.length - 1] ?? 0,
      mean_sync: syncValues.reduce((a, b) => a + b, 0) / syncValues.length,
      max_sync: Math.max(...syncValues),
      steps: this.step,
    };
  }
}

/**
 * Initialize agents with Kuramoto parameters based on their roles
 */
export function initializeAgentPhases(agents: SwarmAgent[]): SwarmAgent[] {
  return agents.map(agent => ({
    ...agent,
    natural_frequency: agent.natural_frequency ??
      (ROLE_FREQUENCY_RANGES[agent.role][0] +
        Math.random() * (ROLE_FREQUENCY_RANGES[agent.role][1] - ROLE_FREQUENCY_RANGES[agent.role][0])),
    phase: agent.phase ?? Math.random() * 2 * Math.PI,
    coupling_weight: agent.coupling_weight ?? ROLE_COUPLING_WEIGHTS[agent.role],
    notes_played: 0,
    contribution_score: 0,
  }));
}

export default KuramotoEngine;
