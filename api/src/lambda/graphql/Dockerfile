FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Install yarn
RUN npm install -g yarn

# Copy package.json, yarn.lock, and patches
COPY package.json yarn.lock ./
COPY patches ./patches

# Install dependencies and apply patches
RUN yarn install && yarn postinstall

# Copy the bundled code
COPY ./dist/graphql/handler.js ${LAMBDA_TASK_ROOT}/
COPY ./dist/graphql/handler.js.map ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "handler.handler" ]