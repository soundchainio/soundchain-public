FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Install yarn
RUN npm install -g yarn

# Copy package.json, yarn.lock, and patches
COPY package.json yarn.lock ./

# Install dependencies and apply patches
RUN yarn install

# Copy the entire src directory
COPY src ${LAMBDA_TASK_ROOT}/src

# Set the CMD to use ts-node for running the TypeScript handler
CMD ["node", "-r", "ts-node/register", "./src/lambda/graphql/handler.ts"]