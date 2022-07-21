import { AuthTokenError } from './../services/errors/AuthTokenError';
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { destroyCookie, parseCookies } from "nookies";

export function withSSRAuth<P>(fn: GetServerSideProps<P>): GetServerSideProps {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx);
    const token = cookies['nextauth.token']

    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    try {
      return await fn(ctx)

    } catch (error) {
      if (error instanceof AuthTokenError) {
        destroyCookie(undefined, "nextauthjwt.token");
        destroyCookie(undefined, "nextauthjwt.refreshToken");
    
        return {
          redirect: {
            destination: "/",
            permanent: false,
          },
        };
      }
    }
  }
}