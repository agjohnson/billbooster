# Set the following environment variables to configure the server:
#
#  * GOOGLE_API_TOKEN
#  * HTTP_PORT

FROM node:6-alpine

RUN mkdir -p /srv/http
WORKDIR /srv/http
COPY . /srv/http
RUN npm install

EXPOSE 9000

CMD ["npm", "start"]
