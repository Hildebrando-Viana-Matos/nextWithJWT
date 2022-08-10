import { AuthTokenError } from './../services/errors/AuthTokenError';
import { GetServerSideProps, GetServerSidePropsContext, GetServerSidePropsResult } from 'next';
import { destroyCookie, parseCookies } from "nookies";
import decode from 'jwt-decode';
import { validateUserPermissions } from './validateUserPermissions';

type withSSRAuthOptions = {
  permissions?: string[];
  roles?: string[];
}

export function withSSRAuth<P>(fn: GetServerSideProps<P>, options?: withSSRAuthOptions): GetServerSideProps {
  return async (ctx: GetServerSidePropsContext): Promise<GetServerSidePropsResult<P>> => {
    const cookies = parseCookies(ctx);
    const token = cookies['nextauthjwt.token']

    if (!token) {
      return {
        redirect: {
          destination: '/',
          permanent: false
        }
      }
    }

    if (options) {
      const user = decode<{ permissions: string[], roles: string[] }>(token);

      const { permissions, roles } = options;

      const userHaValidPermissions = validateUserPermissions({
        user,
        permissions,
        roles
      })

      // The user don`t have permissions to access this page
      if (!userHaValidPermissions) {
        return {
          redirect: {
            destination: '/dashboard',
            permanent: false
          }
        }
      }
    }

    try {
      return await fn(ctx);
    } catch (error) {
      if (error instanceof AuthTokenError) {
        destroyCookie(ctx, 'nextauthjwt.token')
        destroyCookie(ctx, 'nextauthjwt.refreshToken')
    
        return {
          redirect: {
            destination: '/',
            permanent: false
          }
        }
      }
    
      return {
        redirect: {
          destination: '/error',
          permanent: false
        }
      }
    }
  }
}