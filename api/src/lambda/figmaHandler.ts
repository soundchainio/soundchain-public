import { APIGatewayProxyHandler } from "aws-lambda";
import axios from "axios";

const FIGMA_TOKEN = process.env.FIGMA_TOKEN!;
const FIGMA_FILE_KEY = process.env.FIGMA_FILE_KEY!;

export const getFigmaData: APIGatewayProxyHandler = async () => {
  try {
    // 1. Fetch full file JSON
    const fileRes = await axios.get(
      `https://api.figma.com/v1/files/${FIGMA_FILE_KEY}`,
      { headers: { "X-Figma-Token": FIGMA_TOKEN } }
    );

    const doc = fileRes.data.document;

    // 2. Collect all top-level frames across all pages
    const frameNodes: string[] = [];
    doc.children.forEach((page: any) => {
      page.children.forEach((n: any) => {
        if (n.type === "FRAME") frameNodes.push(n.id);
      });
    });

    // 3. Fetch preview images for those frames
    const imagesRes = await axios.get(
      `https://api.figma.com/v1/images/${FIGMA_FILE_KEY}?ids=${frameNodes.join(
        ","
      )}&format=png`,
      { headers: { "X-Figma-Token": FIGMA_TOKEN } }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        name: fileRes.data.name,
        lastModified: fileRes.data.lastModified,
        document: doc,
        images: imagesRes.data.images, // nodeId -> imageURL
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
