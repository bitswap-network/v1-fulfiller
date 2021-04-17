"use strict";
module.exports = {
    apps: [
        {
            name: "fulfiller",
            script: "./build/index.js",
            max_memory_restart: "500M",
            instances: 1,
            autorestart: true,
            env: {
                NODE_ENV: "development",
            },
            env_production: {
                NODE_ENV: "production",
            },
        },
    ],
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNvc3lzdGVtLmNvbmZpZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL2Vjb3N5c3RlbS5jb25maWcuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBLE1BQU0sQ0FBQyxPQUFPLEdBQUc7SUFDZixJQUFJLEVBQUU7UUFDSjtZQUNFLElBQUksRUFBRSxXQUFXO1lBQ2pCLE1BQU0sRUFBRSxrQkFBa0I7WUFDMUIsa0JBQWtCLEVBQUUsTUFBTTtZQUMxQixTQUFTLEVBQUUsQ0FBQztZQUNaLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLEdBQUcsRUFBRTtnQkFDSCxRQUFRLEVBQUUsYUFBYTthQUN4QjtZQUNELGNBQWMsRUFBRTtnQkFDZCxRQUFRLEVBQUUsWUFBWTthQUN2QjtTQUNGO0tBQ0Y7Q0FDRixDQUFDIn0=