/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import * as WaveformCursorPlugin from 'wavesurfer.js/dist/plugin/wavesurfer.cursor';
import { getRandomPeakFileData } from './peaks';
interface Props {
  url: string;
  isPlaying: boolean;
  setProgressStateFromSlider: (value: number) => void;
  setIsReady: (params: boolean) => void;
  progress: number;
}

type ModWaveSurfer = WaveSurfer & {
  progressColor: string | string[];
};

type ModHtmlAudioElement = HTMLAudioElement & ModWaveSurfer;

const WavesurferComponent = (props: Props) => {
  const { url, isPlaying, setProgressStateFromSlider, progress, setIsReady, ...rest } = props;

  const wavesurfer = useRef<ModHtmlAudioElement | null>(null);
  const waveformRef = useRef<HTMLDivElement | null>(null);

  const [saveCurrentTime, setSaveCurrentTime] = useState(0);

  const isMuted = wavesurfer?.current?.getMute();
  const currentTime = wavesurfer?.current?.getCurrentTime();

  const buildWaveformGradient = () => {
    const doc = document as unknown as any;
    const gradient = doc.createElement('canvas').getContext('2d').createLinearGradient(0, 224, 224, 224);
    gradient.addColorStop(0, '#26D1A8');
    gradient.addColorStop(0.25, '#AC4EFD');
    gradient.addColorStop(0.4948, '#F1419E');
    gradient.addColorStop(0.724, '#FED503');
    gradient.addColorStop(1, '#FE5540');

    return gradient;
  };

  useEffect(() => {
    if (!wavesurfer.current) return;

    const modedWaveSurfer = WaveSurfer as unknown as ModWaveSurfer;

    wavesurfer.current = modedWaveSurfer.create({
      barWidth: 3,
      container: waveformRef.current,
      backend: 'MediaElement',
      height: 30,
      barRadius: 3,
      responsive: true,
      progressColor: buildWaveformGradient(),
      hideScrollbar: true,
      waveColor: '#1C1B1B',
      barGap: 3,
      normalize: true,
      cursorColor: 'transparent',
      plugins: [
        WaveformCursorPlugin.create({
          showTime: true,
          opacity: 1,
          customShowTimeStyle: {
            'background-color': '#000',
            color: '#fff',
            padding: '2px',
            'font-size': '10px',
          },
        }),
      ],
    });

    const peakData = getRandomPeakFileData();

    wavesurfer?.current?.load(url, peakData);

    if (!wavesurfer) return;

    return () => wavesurfer?.current?.destroy();
  }, [url]);

  useEffect(() => {
    if (!isMuted) wavesurfer.current?.setMute(true);
    if (isPlaying) wavesurfer.current?.play();
    if (!isPlaying) wavesurfer.current?.pause();
    if (saveCurrentTime !== progress && currentTime) setProgressStateFromSlider(Math.floor(currentTime));
  }, [isPlaying, isMuted, saveCurrentTime]);

  wavesurfer.current?.on('seek', function () {
    if (!currentTime) return;

    setSaveCurrentTime(Math.floor(currentTime));
  });

  const attachReadyEvent = () => {
    wavesurfer.current?.on('ready', function () {
      setIsReady(true);
    });
  };

  const unAttachReadyEvent = () => {
    wavesurfer.current?.un('ready', function () {
      setIsReady(false);
    });
  };

  useEffect(() => {
    attachReadyEvent();

    return () => unAttachReadyEvent();
  }, []);

  return (
    <>
      <div ref={waveformRef} className="w-56 mx-auto my-0" {...rest} />
      <audio ref={wavesurfer} />
    </>
  );
};

export default WavesurferComponent;
