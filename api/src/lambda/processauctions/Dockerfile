FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Install Python and other necessary build tools
RUN dnf update -y && \
    dnf install -y python3 python3-devel make gcc gcc-c++ && \
    dnf clean all && \
    ln -s /usr/bin/python3 /usr/local/bin/python

# Copy package.json, yarn.lock, and other necessary files
COPY package.json ${LAMBDA_TASK_ROOT}/

# Install Yarn
RUN npm install -g yarn

# Install dependencies using frozen lockfile
RUN yarn install

# Install TypeScript globally
RUN npm install -g typescript

# Copy the rest of the function code
COPY . ${LAMBDA_TASK_ROOT}

# Build
RUN tsc

# Copy SSL cert for DocumentDB TLS connection
# config.ts looks for it at path.join(__dirname, '..', 'global-bundle.pem')
# Since __dirname is .build/src, it resolves to .build/global-bundle.pem
COPY global-bundle.pem ./.build/

# Command to run your Lambda function
CMD [ "./.build/src/lambda/processauctions/handler.processAuctions" ]
