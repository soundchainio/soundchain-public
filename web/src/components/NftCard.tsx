/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from 'components/Button';
import { InputField } from 'components/InputField';
import { Form, Formik } from 'formik';
import { approveMarketplace, burnNftToken, getIpfsAssetUrl, listItem, transferNftToken } from 'lib/blockchain';
import { useMimeTypeLazyQuery, useMimeTypeQuery } from 'lib/graphql';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { NftToken } from 'types/NftTypes';
import Web3 from 'web3';
import * as yup from 'yup';
import { Label } from './Label';

export const audioMimeTypes = [
  'audio/basic',
  'audio/mid',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/vnd.wav',
  'audio/vorbis',
  'audio/wav',
  'audio/wave',
  'audio/webm',
  'audio/x-aiff',
  'audio/x-mpegurl',
  'audio/x-pn-wav',
  'audio/x-wav',
  'audio/L24',
];

export const videoMimeTypes = [
  'application/vnd.apple.mpegurl',
  'application/x-mpegurl',
  'video/3gpp',
  'video/mp2t',
  'video/mp4',
  'video/mpeg',
  'video/ms-asf',
  'video/ogg',
  'video/quicktime',
  'video/webm',
  'video/x-flv',
  'video/x-m4v',
  'video/x-ms-wmv',
  'video/x-msvideo',
];

interface NftCardProps {
  account: string;
  web3: Web3;
  nftToken: NftToken;
}

export const NFTCard = ({ account, web3, nftToken }: NftCardProps) => {
  const { tokenId, asset, name, description, art, attributes, pricePerItem, quantity, startingTime, contractAddress } =
    nftToken;
  const assetURL = getIpfsAssetUrl(asset);
  const artURL = art && getIpfsAssetUrl(art);
  const { data: assetData } = useMimeTypeQuery({ variables: { url: getIpfsAssetUrl(asset) } });
  const [loadArtMimeType, { data: artData }] = useMimeTypeLazyQuery();
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    if (artURL) {
      loadArtMimeType({ variables: { url: artURL } });
    }
  }, []);

  const handleBurn = async (web3: Web3, tokenId: string) => {
    const confirmed = confirm('Hey! This will destroy this NFT, you sure?');
    if (confirmed) {
      const result = await burnNftToken(web3, tokenId, account);
      if (result) {
        alert('Token burn requested!');
      }
    }
  };

  const handleList = async (web3: Web3, tokenId: string, price: number) => {
    const confirmed = confirm('Hey! This will list this NFT, you sure?');
    if (confirmed) {
      const result = await listItem(web3, tokenId, 1, account, price);
      if (result) {
        alert('Token list requested!');
      }
    }
  };

  const handleApprove = async (web3: Web3) => {
    const confirmed = confirm('Hey! The marketplace will be able to transfer your NFTs, you sure?');
    if (confirmed) {
      const result = await approveMarketplace(web3, account);
      if (result) {
        alert('Token approve requested!');
      }
    }
  };

  const handleSubmit = async (values: ListFormValue) => {
    await handleList(web3, tokenId, values.price);
  };

  if (!assetData) return <div className="text-white">Loading...</div>;

  return (
    <div className="relative h-full mb-24">
      {transferring && (
        <TransferForm
          name={name}
          web3={web3}
          fromAddress={account}
          tokenId={tokenId}
          onCancel={() => setTransferring(false)}
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
        <div className="text-white text-xs">{`Price: ${pricePerItem}`}</div>
        <div className="text-white text-xs">{`Quantity: ${quantity}`}</div>
        <div className="text-white text-xs pb-5">{`Starting time: ${startingTime}`}</div>
      </div>
      <div className="absolute bottom-0">
        <Formik initialValues={listInitialValues} validationSchema={listValidationSchema} onSubmit={handleSubmit}>
          <Form>
            <div className="flex gap-2 flex-wrap items-center">
              <Button variant="rainbow-xs" className="" onClick={() => setTransferring(true)}>
                Transfer
              </Button>
              <Button variant="rainbow-xs" onClick={() => handleBurn(web3, tokenId)}>
                Burn
              </Button>
              <Button variant="rainbow-xs" onClick={() => handleApprove(web3)}>
                Approve Marketplace
              </Button>
              <Button variant="rainbow-xs" type="submit">
                List
              </Button>
              <div className="flex items-center gap-2">
                <Label>Price</Label>
                <InputField style={{ maxWidth: '60px' }} name="price" type="text" />
              </div>
            </div>
          </Form>
        </Formik>
        <a
          href={`https://mumbai.polygonscan.com/token/${contractAddress}?a=${tokenId}`}
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

  if (videoMimeTypes.includes(mimeType)) {
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

  if (audioMimeTypes.includes(mimeType)) {
    const isChrome = !!(window as any).chrome;
    return (
      <audio src={src} controls className="w-full" style={{ backgroundColor: `${isChrome ? '#f1f3f4' : 'unset'}` }} />
    );
  }

  return (
    <div className="relative" style={{ height: `${art ? '200px' : '254px'}` }}>
      <Image src={src} layout="fill" objectFit="contain" alt="" />
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

interface ListFormValue {
  price: number;
}
const listValidationSchema: yup.SchemaOf<ListFormValue> = yup.object().shape({
  price: yup.number().required(),
});
const listInitialValues: ListFormValue = {
  price: 0,
};

interface TransferFormProps {
  web3: Web3;
  fromAddress: string;
  tokenId: string;
  name: string;
  onCancel: () => void;
}

const TransferForm = ({ name, web3, fromAddress, tokenId, onCancel }: TransferFormProps) => {
  const [loading, setLoading] = useState(false);
  const handleSubmit = async (values: FormValues) => {
    setLoading(true);
    const result = await transferNftToken(web3, tokenId, fromAddress, values.to);
    if (result) {
      alert('Token transfer requested!');
    }
    setLoading(false);
    onCancel();
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
                  {loading ? 'Requesting...' : 'Transfer'}
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
