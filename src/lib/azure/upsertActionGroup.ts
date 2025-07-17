export interface ActionGroupOptions {
  name?: string;
  shortName?: string;
  notifications: {
    webhook: {
      name: string;
      uri: string;
      commonAlertSchema?: boolean;
    }[];
    email?: {
      name: string;
      address: string;
    }[];
    // other receiver types can be added here
  };
}

/**
 * Creates or updates an Azure Monitor Action Group with specified receivers.
 * @param accessToken Azure management API access token.
 * @param subscriptionId Azure subscription ID.
 * @param resourceGroupName Resource group where the Action Group lives.
 * @param options Configuration for the Action Group and its receivers.
 * @returns The resource ID of the Action Group.
 */
export async function upsertActionGroup(
  accessToken: string,
  subscriptionId: string,
  resourceGroupName: string,
  options: ActionGroupOptions
): Promise<string> {
  // Validate required inputs
  if (!accessToken) throw new Error('Missing Azure access token');
  if (!subscriptionId) throw new Error('Missing subscription ID');
  if (!resourceGroupName) throw new Error('Missing resource group name');
  if (!options.notifications.webhook.length) {
    throw new Error('At least one webhook receiver must be provided');
  }

  // Prepare identifiers
  const actionGroupName = options.name ?? `AG-${resourceGroupName}`;
  const shortName = options.shortName ?? resourceGroupName.slice(0, 12);
  const apiVersion = '2021-09-01';

  // Build request URL
  const requestUrl =
    `https://management.azure.com/subscriptions/${encodeURIComponent(subscriptionId)}` +
    `/resourceGroups/${encodeURIComponent(resourceGroupName)}` +
    `/providers/microsoft.insights/actionGroups/${encodeURIComponent(actionGroupName)}` +
    `?api-version=${apiVersion}`;

  // Construct receivers
  const webhookReceivers = options.notifications.webhook.map(w => ({
    name: w.name,
    serviceUri: w.uri,
    useCommonAlertSchema: !!w.commonAlertSchema,
  }));

  const emailReceivers = options.notifications.email?.map(e => ({
    name: e.name,
    emailAddress: e.address,
  }));

  // Build payload
  const payload: any = {
    location: 'global',
    properties: {
      groupShortName: shortName,
      enabled: true,
      webhookReceivers,
    },
  };

  if (emailReceivers?.length) {
    payload.properties.emailReceivers = emailReceivers;
  }

  // Perform HTTP request using global fetch
  let response: Response;
  try {
    response = await fetch(requestUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    throw new Error(`Network error creating Action Group: ${err}`);
  }

  const responseData = await response.json();
  if (!response.ok) {
    const errorMsg = responseData.error?.message ?? JSON.stringify(responseData);
    throw new Error(`Failed to upsert Action Group (status ${response.status}): ${errorMsg}`);
  }

  return responseData.id;
}
