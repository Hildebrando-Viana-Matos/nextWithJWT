import axios, { AxiosError } from "axios";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../context/AuthContext";

type FailedRequestsQueueProps = {
  onSuccess: (token: string) => void;
  onFailure: (error: AxiosError) => void;
}

let cookies = parseCookies();
let isRefreshing = false;
let failedRequestsQueue = Array<FailedRequestsQueueProps>();

export const api = axios.create({
  baseURL: "http://localhost:3333",
  headers: {
    Authorization: `Bearer ${cookies["nextauthjwt.token"]}`,
  },
});

api.interceptors.response.use(
  (response) => {},
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (error.response.data === "token.expired") {
        // renovar o token
        cookies = parseCookies();

        const { "nextauthjwt.refreshToken": refreshToken } = cookies;
        const originalConfig = error.config

        if (!isRefreshing) {
          isRefreshing = true;

          api
            .post("refresh", {
              refreshToken,
            })
            .then((response) => {
              const { token } = response.data;

              setCookie(undefined, "nextauthjwt.token", token, {
                maxAge: 60 * 60 * 24 * 30, // 30 days
                path: "/",
              });
              setCookie(
                undefined,
                "nextauthjwt.refreshToken",
                response.data.refreshToken,
                {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: "/",
                }
              );

              api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

              failedRequestsQueue.forEach(request => request.onSuccess(token));
              failedRequestsQueue = [];
            }).catch(err => {
              failedRequestsQueue.forEach(request => request.onFailure(err));
              failedRequestsQueue = [];
            }).finally(() => {
              isRefreshing = false
            });
          
        return new Promise((resolve, reject) => {
          failedRequestsQueue.push({
            onSuccess: (token: string) => {
              if(!originalConfig.headers) {
                return console.log("Error");
              }
              originalConfig.headers["Authorization"] = `Bearer ${token}`;

              resolve(api(originalConfig))
            },
            onFailure: (err: AxiosError) => {
              reject(err)
            }
          })
        })
        }
      }  else {
        // deslogar o usuário
        signOut();
      }
    } 

    return Promise.reject(error)
  }
);
