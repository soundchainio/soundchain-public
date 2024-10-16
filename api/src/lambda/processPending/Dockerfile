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

COPY global-bundle.pem ./.build/src/lambda/processpending/

# Command to run your Lambda function
CMD [ "./.build/src/lambda/processpending/handler.processPending" ]
