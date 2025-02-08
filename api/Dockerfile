FROM public.ecr.aws/lambda/nodejs:18

# Install Python & dependencies for node-gyp
RUN yum install -y python3 make gcc g++ && \
    ln -s /usr/bin/python3 /usr/bin/python

ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_DEFAULT_REGION

ENV AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
ENV AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
ENV AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION}


# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy source code
COPY src/ ./src/

# Set the CMD to your handler
CMD [ "src/lambdas/handler.handler" ]
