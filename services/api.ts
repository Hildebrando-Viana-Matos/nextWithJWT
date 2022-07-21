import { AuthTokenError } from './errors/AuthTokenError';
import axios, { AxiosError } from "axios";
import { GetServerSidePropsContext } from "next";
import { parseCookies, setCookie } from "nookies";
import { signOut } from "../context/AuthContext";

type FailedRequestsQueueProps = {
  onSuccess: (token: string) => void;
  onFailure: (error: AxiosError) => void;
}

let isRefreshing = false;
let failedRequestsQueue = Array<FailedRequestsQueueProps>();

export function setupAPIClient(ctx: GetServerSidePropsContext | undefined = undefined) {
  let cookies = parseCookies(ctx);

  const api = axios.create({
    baseURL: "http://localhost:3333"
  });
  
  api.defaults.headers.common["Authorization"] = `Bearer ${cookies["nextauthjwt.token"]}`;
  
  api.interceptors.response.use(
    (response) => {
      return response
    },
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        if (error.response.data === "token.expired") {
          // renovar o token
          cookies = parseCookies(ctx);
  
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
  
                setCookie(ctx, "nextauthjwt.token", token, {
                  maxAge: 60 * 60 * 24 * 30, // 30 days
                  path: "/",
                });
                setCookie(
                  ctx,
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
  
                if (process.browser) {
                  signOut();
                }
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
          if(process.browser) {
            signOut();
          } else {
            return Promise.reject(new AuthTokenError())
          }
        }
      } 
  
      return Promise.reject(error)
    }
  );

  return api;
} 