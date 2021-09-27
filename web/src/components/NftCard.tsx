/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import { burnNftToken, getIpfsAssetUrl, transferNftToken } from 'lib/blockchain';
import { useMimeTypeLazyQuery, useMimeTypeQuery } from 'lib/graphql';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { NftToken } from 'types/NftTypes';
import Web3 from 'web3';
import * as yup from 'yup';

interface NftCardProps {
  account: string;
  web3: Web3;
  nftToken: NftToken;
}

export const NFTCard = ({ account, web3, nftToken }: NftCardProps) => {
  const { tokenId, asset, name, description, art, attributes } = nftToken;
  const assetURL = getIpfsAssetUrl(asset);
  const artURL = art && getIpfsAssetUrl(art);
  const { data: assetData } = useMimeTypeQuery({ variables: { url: getIpfsAssetUrl(asset) } });
  const [loadArtMimeType, { data: artData }] = useMimeTypeLazyQuery();
  const [transfering, setTransfering] = useState(false);

  useEffect(() => {
    if (artURL) {
      loadArtMimeType({ variables: { url: artURL } });
    }
  }, []);

  const handleBurn = async (web3: Web3, tokenId: string) => {
    const confirmed = confirm('Heey! This will destroy this NFT, you sure?');
    if (confirmed) {
      await burnNftToken(web3, tokenId, account);
      alert('Token burned!');
      window.location.reload();
    }
  };

  if (!assetData) return <div className="text-white">Loading...</div>;

  return (
    <div className="relative h-full mb-20">
      {transfering && (
        <TransferForm
          name={name}
          web3={web3}
          fromAddress={account}
          tokenId={tokenId}
          onCancel={() => setTransfering(false)}
        />
      )}
      <div className="border border-white border-solid">
        <Asset src={artURL} mimeType={artData?.mimeType.value} art />
        <Asset src={assetURL} mimeType={assetData?.mimeType.value} />
      </div>
      <div className="text-white text-base font-bold mt-2">{name}</div>
      <div className="text-white text-sm mb-2">{description}</div>
      <div>
        {attributes &&
          attributes.map(({ trait_type, trait_value }, idx) => (
            <div key={idx} className="text-white text-xs">{`${trait_type}: ${trait_value}`}</div>
          ))}
      </div>
      <div className="absolute bottom-0">
        <div className="flex space-x-2">
          <Button variant="rainbow-xs" className="" onClick={() => setTransfering(true)}>
            Transfer
          </Button>
          <Button variant="rainbow-xs" onClick={() => handleBurn(web3, tokenId)}>
            Burn
          </Button>
        </div>
        <a
          href={`https://mumbai.polygonscan.com/token/0x1ca9e523a3d4d2a771e22aaaf51eab33108c6b2c?a=${tokenId}`}
          target="_blank"
          rel="noreferrer"
          className="text-sm yellow-gradient-text"
        >
          See on Polygonscan
        </a>
      </div>
    </div>
  );
};

const Asset = ({ src, mimeType, art }: { src: string | undefined; mimeType: string | undefined; art?: boolean }) => {
  if (!src || !mimeType) return null;

  if (mimeType === 'video/mp4') {
    return (
      <video
        src={src}
        controls={!art}
        loop={art}
        muted={art}
        autoPlay={art}
        className="w-full"
        style={{ height: `${art ? '200px' : '254px'}` }}
      />
    );
  }

  if (mimeType === 'audio/mpeg') {
    const isChrome = !!(window as any).chrome;
    return (
      <audio src={src} controls className="w-full" style={{ backgroundColor: `${isChrome ? '#f1f3f4' : 'unset'}` }} />
    );
  }

  return (
    <div className="relative" style={{ height: '200px' }}>
      <Image src={src} layout="fill" objectFit="cover" alt="" />
    </div>
  );
};

interface FormValues {
  to: string;
}
const validationSchema: yup.SchemaOf<FormValues> = yup.object().shape({
  to: yup.string().required(),
});
const initialValues: FormValues = {
  to: '',
};

interface TransferFormProps {
  web3: Web3;
  fromAddress: string;
  tokenId: string;
  name: string;
  onCancel: () => void;
}

const TransferForm = ({ name, web3, fromAddress, tokenId, onCancel }: TransferFormProps) => {
  const handleSubmit = async (values: FormValues) => {
    await transferNftToken(web3, tokenId, fromAddress, values.to);
    alert('Token transfered!');
    window.location.reload();
  };

  return (
    <div className="absolute bg-gray-20  h-full w-full z-10 flex flex-row items-center justify-center">
      <div className="w-11/12">
        <div className="text-white font-bold">Transfer {name}</div>
        <Formik initialValues={initialValues} validationSchema={validationSchema} onSubmit={handleSubmit}>
          {({ isSubmitting }) => (
            <Form className="flex flex-col justify-between h-full">
              <InputField name="to" label="to" placeholder="0xDbaF8fB344D9E57fff48659A4Eb718c480A1Fd62" type="text" />
              <div className="flex gap-1 mt-4">
                <Button type="submit" variant="rainbow-xs" loading={isSubmitting}>
                  Transfer
                </Button>
                <Button type="button" variant="rainbow-xs" onClick={() => onCancel()}>
                  Cancel
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </div>
  );
};
