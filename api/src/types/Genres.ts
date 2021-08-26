import { registerEnumType } from 'type-graphql';

enum Genre {
  ACOUSTIC = 'acoustic',
  ALTERNATIVE = 'alternative',
  AMBIENT = 'ambient',
  AMERICANA = 'americana',
  C_POP = 'c_pop',
  CHRISTIAN = 'christian',
  CLASSIC_ROCK = 'classic_rock',
  CLASSICAL = 'classical',
  COUNTRY = 'country',
  DANCE = 'dance',
  DEVOTIONAL = 'devotional',
  ELECTRONIC = 'electronic',
  EXPERIMENTAL = 'experimental',
  GOSPEL = 'gospel',
  HARD_ROCK = 'hard_rock',
  HIP_HOP = 'hip_hop',
  INDIE = 'indie',
  JAZZ = 'jazz',
  K_POP = 'k_pop',
  KIDS_AND_FAMILY = 'kids_and_family',
  LATIN = 'latin',
  METAL = 'metal',
  MUSICA_MEXICANA = 'musica_mexicana',
  MUSICA_TROPICAL = 'musica_tropical',
  PODCASTS = 'podcasts',
  POP = 'pop',
  POP_LATINO = 'pop_latino',
  PUNK = 'punk',
  R_AND_B = 'r_and_b',
  REGGAE = 'reggae',
  SALSA = 'salsa',
  SOUL_FUNK = 'soul_funk',
  SOUNDTRACK = 'soundtrack',
  SPOKEN = 'spoken',
  URBAN_LATINO = 'urban_latino',
  WORLD = 'world',
}

registerEnumType(Genre, {
  name: 'Genre',
});

export { Genre };
