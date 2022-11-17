import '@testing-library/jest-dom/extend-expect'
import jestFetchMock from "jest-fetch-mock";
import { TextEncoder, TextDecoder } from 'util';

jestFetchMock.enableMocks();
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
