import os

path = 'src/lib/graphql.ts'
with open(path, 'r') as f:
    lines = f.read().split('\n')
i = next((k for k, l in enumerate(lines) if 'interface ListingItemWithPrice {' in l.lower()), None)
if i is not None:
    props = [
        '  acceptsMATIC?: Maybe<boolean>;',
        '  acceptsOGUN?: Maybe<boolean>;',
        '  acceptsETH?: Maybe<boolean>;',
        '  acceptsUSDC?: Maybe<boolean>;',
        '  acceptsUSDT?: Maybe<boolean>;',
        '  acceptsSOL?: Maybe<boolean>;',
        '  acceptsBNB?: Maybe<boolean>;',
        '  acceptsDOGE?: Maybe<boolean>;',
        '  acceptsBONK?: Maybe<boolean>;',
        '  acceptsMEATEOR?: Maybe<boolean>;',
        '  acceptsPEPE?: Maybe<boolean>;',
        '  acceptsBASE?: Maybe<boolean>;',
        '  acceptsXTZ?: Maybe<boolean>;',
        '  acceptsAVAX?: Maybe<boolean>;',
        '  acceptsSHIB?: Maybe<boolean>;',
        '  acceptsXRP?: Maybe<boolean>;',
        '  acceptsSUI?: Maybe<boolean>;',
        '  acceptsHBAR?: Maybe<boolean>;',
        '  acceptsLINK?: Maybe<boolean>;',
        '  acceptsLTC?: Maybe<boolean>;',
        '  acceptsZETA?: Maybe<boolean>;',
        '  acceptsBTC?: Maybe<boolean>;',
        '  acceptsPENGU?: Maybe<boolean>;',
        '  acceptsYZY?: Maybe<boolean>;'
    ]
    # Add only missing props
    added = []
    for p in props:
        if not any(p in l for l in lines[i+1:]):
            lines.insert(i+1, p)
            added.append(p)
    with open(path, 'w') as f:
        f.write('\n'.join(lines))
    print(f'Added {len(added)} missing acceptsXXX to ListingItemWithPrice')
else:
    print('No ListingItemWithPrice interface found')
