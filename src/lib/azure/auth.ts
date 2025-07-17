import { User } from "@/models/user";
import { getUserFromToken } from "../auth";

export async function getAzureOAuthUrl() {
  const userfromtoken=await getUserFromToken();
    const userId = userfromtoken?.id;
    const user = await User.findById(userId);


  const params = new URLSearchParams({
    client_id: user.accountCredentials.clientId!,
    response_type: "code",
    redirect_uri: process.env.AZURE_REDIRECT_URI!,
    response_mode: "query",
    scope: "https://management.azure.com/user_impersonation offline_access",
    state: "random_state_string", // optionald
  });

  return `https://login.microsoftonline.com/${user.accountCredentials.tenantId}/oauth2/v2.0/authorize?${params}`;
}
