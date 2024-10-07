FROM public.ecr.aws/lambda/nodejs:20

WORKDIR ${LAMBDA_TASK_ROOT}

# Copy the bundled code
COPY ./dist/graphql/handler.js ${LAMBDA_TASK_ROOT}/
COPY ./dist/graphql/handler.js.map ${LAMBDA_TASK_ROOT}/

# Set the CMD to your handler
CMD [ "handler.handler" ]
