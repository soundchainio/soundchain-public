FROM public.ecr.aws/lambda/nodejs:18

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION

ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}


# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm i

# Copy source code
COPY src/ ./src/

# Set the CMD to your handler
CMD [ "src/lambdas/handler.handler" ]