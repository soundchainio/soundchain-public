FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies
RUN npm install --production

# Copy built code
COPY ./dist/hello ${LAMBDA_TASK_ROOT}/

# Set the ENTRYPOINT and CMD
CMD [ "handler.handler" ]
