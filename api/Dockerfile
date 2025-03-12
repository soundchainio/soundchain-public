FROM node:18

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN rm -f src/services/AuctionItemService.ts

EXPOSE 4000
CMD ["npm", "run", "start"]
