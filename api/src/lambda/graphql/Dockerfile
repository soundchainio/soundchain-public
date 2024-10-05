FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm i

# Copy built code
COPY . .

# CMD will be updated by the build script
CMD [ "handler.handler" ]