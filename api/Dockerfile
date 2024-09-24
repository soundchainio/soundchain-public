FROM public.ecr.aws/lambda/nodejs:20

# Copy function code
COPY . ${LAMBDA_TASK_ROOT}/

# Install npm dependencies
RUN npm install

# Set the CMD to your handler
CMD [ "handler.handler" ]