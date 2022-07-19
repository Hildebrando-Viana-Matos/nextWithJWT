import { useContext, useEffect } from "react";

import { AuthContext } from "../context/AuthContext";

import { setupAPIClient } from "../services/api";
import { api } from "../services/apiClient";

import { withSSRAuth } from "../utils/withSRRAuth";

export default function Dashboard() {
  const { user } = useContext(AuthContext);
  useEffect(() => {
    api
      .get("/me")
      .then((response) => {
        console.log(response);
      })
      .catch((err) => {
        console.log(err);
      });
  });
  return (
    <div>
      <h1>Hello World, {user?.email}</h1>
    </div>
  );
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIClient(ctx);
  const response = apiClient.get("/me");

  console.log(response.data);
  return {
    props: {},
  };
});
