/* eslint-disable @typescript-eslint/no-var-requires */
export const getRandomPeakFileData = () => {
  const arrayOfPeaks = [
    'song1',
    'song2',
    'song3',
    'song4',
    'song5',
    'song6',
    'song7',
    'song8',
    'song9',
    'song10',
    'song11',
    'song12',
    'song13',
    'song14',
    'song15',
    'song16',
    'song17',
    'song18',
    'song19',
    'song20',
  ]
  const min = 1
  const max = 20
  const randomNumberBetween1And20 = Math.floor(Math.random() * (max - min) + min)

  const songFileName = `${arrayOfPeaks[randomNumberBetween1And20]}.json`

  return require(`./${songFileName}`).data
}
