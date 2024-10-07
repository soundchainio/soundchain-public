FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Install yarn
RUN npm install -g yarn

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install

# Copy the entire src directory
COPY . ${LAMBDA_TASK_ROOT}/

# Set the CMD to use ts-node for running the TypeScript handler
CMD ["./node_modules/.bin/ts-node", "./src/lambda/hello/handler.ts"]