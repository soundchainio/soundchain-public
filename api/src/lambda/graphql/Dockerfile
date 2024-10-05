FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy package.json and package-lock.json (if you have one)
COPY package*.json ./

# Install production dependencies
RUN npm i

# Copy only the bundled code
COPY ./dist/graphql ${LAMBDA_TASK_ROOT}/

# Set the CMD
CMD [ "handler.handler" ]