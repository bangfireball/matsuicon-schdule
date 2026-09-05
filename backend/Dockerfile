FROM node:22-alpine
WORKDIR /app
COPY backend/server.js ./server.js
COPY data/schedule.json /data/schedule.json
ENV SCHEDULE_PATH=/data/schedule.json
ENV LOG_DIR=/logs
EXPOSE 3000
CMD ["node", "server.js"]
