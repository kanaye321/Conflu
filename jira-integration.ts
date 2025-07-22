
interface JiraSettings {
  enabled: boolean;
  webhookUrl: string;
  automationWebhookUrl?: string;
  enableAutomation?: boolean;
  projectKey: string;
  issueTypeId?: string;
  priorityMapping: {
    Low: string;
    Medium: string;
    High: string;
    Critical: string;
  };
  customFields?: string;
  authentication: {
    type: 'none' | 'basic' | 'token';
    username?: string;
    password?: string;
    token?: string;
  };
}

interface IssueData {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  issueType: string;
  submittedBy: string;
}

export async function createJiraTicket(settings: JiraSettings, issueData: IssueData): Promise<string> {
  if (!settings.enabled || !settings.webhookUrl || !settings.projectKey) {
    throw new Error('JIRA integration is not properly configured');
  }

  try {
    // Prepare authentication headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (settings.authentication.type === 'basic' && settings.authentication.username && settings.authentication.password) {
      const credentials = Buffer.from(`${settings.authentication.username}:${settings.authentication.password}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (settings.authentication.type === 'token' && settings.authentication.username && settings.authentication.token) {
      const credentials = Buffer.from(`${settings.authentication.username}:${settings.authentication.token}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    // Map priority
    const priorityId = settings.priorityMapping[issueData.priority] || settings.priorityMapping.Medium;

    // Build issue payload
    const issuePayload: any = {
      fields: {
        project: {
          key: settings.projectKey
        },
        summary: issueData.title,
        description: {
          type: "doc",
          version: 1,
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: issueData.description
                }
              ]
            },
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: `Submitted by: ${issueData.submittedBy}`
                }
              ]
            }
          ]
        },
        issuetype: {
          id: settings.issueTypeId || "10001"
        },
        priority: {
          id: priorityId
        }
      }
    };

    // Add custom fields if configured
    if (settings.customFields) {
      try {
        const customFields = JSON.parse(settings.customFields);
        Object.assign(issuePayload.fields, customFields);
      } catch (error) {
        console.warn('Failed to parse custom fields:', error);
      }
    }

    console.log('Creating JIRA ticket with payload:', JSON.stringify(issuePayload, null, 2));

    const response = await fetch(settings.webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(issuePayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('JIRA API Error Response:', errorText);
      throw new Error(`JIRA API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    const ticketKey = result.key;

    if (!ticketKey) {
      throw new Error('No ticket key returned from JIRA');
    }

    console.log(`JIRA ticket created successfully: ${ticketKey}`);

    // Trigger automation if enabled
    if (settings.enableAutomation && settings.automationWebhookUrl) {
      try {
        await triggerJiraAutomation(settings.automationWebhookUrl, {
          ticketKey,
          issueType: issueData.issueType,
          priority: issueData.priority,
          submittedBy: issueData.submittedBy,
          title: issueData.title
        });
      } catch (automationError) {
        console.warn('JIRA automation trigger failed:', automationError);
        // Don't fail the main ticket creation for automation failures
      }
    }

    return ticketKey;
  } catch (error) {
    console.error('Error creating JIRA ticket:', error);
    throw new Error(`Failed to create JIRA ticket: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function triggerJiraAutomation(webhookUrl: string, data: any): Promise<void> {
  try {
    console.log('Triggering JIRA automation:', webhookUrl);
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ...data,
        timestamp: new Date().toISOString(),
        source: 'SRPH-MIS'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Automation webhook failed (${response.status}): ${errorText}`);
    }

    console.log('JIRA automation triggered successfully');
  } catch (error) {
    console.error('JIRA automation error:', error);
    throw error;
  }
}

export async function testJiraConnection(settings: JiraSettings): Promise<any> {
  try {
    console.log('Testing JIRA connection...');
    
    if (!settings.webhookUrl || !settings.projectKey) {
      throw new Error('JIRA URL and Project Key are required');
    }

interface IssueData {
  title: string;
  description: string;
  priority: string;
  issueType: string;
  environment?: string;
  stepsToReproduce?: string;
  expectedBehavior?: string;
  actualBehavior?: string;
  userEmail?: string;
  submittedBy: string;
}

export async function createJiraTicket(settings: JiraSettings, issueData: IssueData): Promise<string> {
  const { webhookUrl, automationWebhookUrl, enableAutomation, projectKey, issueTypeId, priorityMapping, customFields, authentication } = settings;
  
  // Build issue description using JIRA markup
  let description = `h3. Reported by: ${issueData.submittedBy}\n\n`;
  description += `h3. Description:\n${issueData.description}\n\n`;
  
  if (issueData.environment) {
    description += `h3. Environment:\n${issueData.environment}\n\n`;
  }
  
  if (issueData.stepsToReproduce) {
    description += `h3. Steps to Reproduce:\n${issueData.stepsToReproduce}\n\n`;
  }
  
  if (issueData.expectedBehavior) {
    description += `h3. Expected Behavior:\n${issueData.expectedBehavior}\n\n`;
  }
  
  if (issueData.actualBehavior) {
    description += `h3. Actual Behavior:\n${issueData.actualBehavior}\n\n`;
  }
  
  if (issueData.userEmail) {
    description += `h3. Contact Email: ${issueData.userEmail}\n\n`;
  }
  
  // Map issue types to common JIRA issue types
  const issueTypeMapping: { [key: string]: string } = {
    'Incident': 'Bug',
    'Bug': 'Bug',
    'Feature Request': 'Story',
    'Improvement': 'Improvement',
    'Task': 'Task'
  };
  
  // Build JIRA issue payload
  const payload: any = {
    fields: {
      project: {
        key: projectKey
      },
      summary: issueData.title,
      description: description
    }
  };

  // Set issue type - use ID if provided, otherwise use name
  if (issueTypeId) {
    payload.fields.issuetype = { id: issueTypeId };
  } else {
    const issueTypeName = issueTypeMapping[issueData.issueType] || 'Bug';
    payload.fields.issuetype = { name: issueTypeName };
  }
  
  // Add priority mapping
  const priorityId = priorityMapping[issueData.priority as keyof typeof priorityMapping];
  if (priorityId) {
    payload.fields.priority = { id: priorityId };
  }
  
  // Add custom fields if specified
  if (customFields && customFields.trim()) {
    try {
      const customFieldsObj = JSON.parse(customFields);
      Object.assign(payload.fields, customFieldsObj);
    } catch (error) {
      console.warn('Invalid custom fields JSON:', error);
    }
  }
  
  // Prepare headers
  const headers: { [key: string]: string } = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Add authentication
  if (authentication.type === 'basic' && authentication.username && authentication.password) {
    const auth = Buffer.from(`${authentication.username}:${authentication.password}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  } else if (authentication.type === 'token' && authentication.token && authentication.username) {
    // For JIRA Cloud API tokens, use email + token with Basic auth
    const auth = Buffer.from(`${authentication.username}:${authentication.token}`).toString('base64');
    headers['Authorization'] = `Basic ${auth}`;
  }
  
  console.log('Creating JIRA ticket with payload:', JSON.stringify(payload, null, 2));
  
  // Make request to JIRA
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });
  
  if (!response.ok) {
    let errorText;
    try {
      const errorJson = await response.json();
      errorText = JSON.stringify(errorJson, null, 2);
    } catch {
      errorText = await response.text();
    }
    throw new Error(`JIRA API error (${response.status}): ${errorText}`);
  }
  
  const result = await response.json();
  console.log('JIRA ticket created successfully:', result);
  
  const ticketKey = result.key || result.id || 'Unknown';
  
  // Trigger JIRA automation webhook if enabled
  if (enableAutomation && automationWebhookUrl && automationWebhookUrl.trim()) {
    try {
      await triggerJiraAutomation(automationWebhookUrl, {
        ticketKey,
        issueData,
        createdTicket: result
      });
      console.log('JIRA automation webhook triggered successfully');
    } catch (automationError) {
      console.warn('Failed to trigger JIRA automation:', automationError);
      // Don't fail the main ticket creation if automation fails
    }
  }
  
  return ticketKey;
}

export async function triggerJiraAutomation(webhookUrl: string, data: any): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'SRPH-MIS',
      timestamp: new Date().toISOString(),
      data: data
    })
  });

  if (!response.ok) {
    throw new Error(`Automation webhook failed: ${response.status} ${response.statusText}`);
  }
}

export async function testJiraConnection(settings: JiraSettings): Promise<{ message: string; ticketId?: string }> {
  try {
    // Test basic API connectivity first
    const { webhookUrl, authentication } = settings;
    
    // Prepare headers for API test
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    
    // Add authentication for API test
    if (authentication.type === 'basic' && authentication.username && authentication.password) {
      const auth = Buffer.from(`${authentication.username}:${authentication.password}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    } else if (authentication.type === 'token' && authentication.token && authentication.username) {
      // For JIRA Cloud API tokens, use email + token with Basic auth
      const auth = Buffer.from(`${authentication.username}:${authentication.token}`).toString('base64');
      headers['Authorization'] = `Basic ${auth}`;
    }
    
    // Test API connectivity by getting server info
    const serverInfoUrl = webhookUrl.replace('/rest/api/2/issue', '/rest/api/2/serverInfo');
    const serverInfoResponse = await fetch(serverInfoUrl, {
      method: 'GET',
      headers
    });
    
    if (!serverInfoResponse.ok) {
      throw new Error(`JIRA API connectivity test failed: ${serverInfoResponse.status}`);
    }
    
    const serverInfo = await serverInfoResponse.json();
    console.log('JIRA Server Info:', serverInfo);
    
    // Create a test issue to verify full functionality
    const testIssueData: IssueData = {
      title: 'Test Issue - SRPH MIS Integration',
      description: 'This is a test issue created to verify JIRA integration is working correctly.',
      priority: 'Low',
      issueType: 'Task',
      submittedBy: 'System Test'
    };
    
    const ticketId = await createJiraTicket(settings, testIssueData);
    
    let message = `JIRA connection test successful! Test ticket created with ID: ${ticketId}`;
    
    // Test automation webhook if enabled
    if (settings.enableAutomation && settings.automationWebhookUrl) {
      try {
        await triggerJiraAutomation(settings.automationWebhookUrl, {
          testMode: true,
          ticketKey: ticketId,
          message: 'JIRA Automation test from SRPH-MIS'
        });
        message += ' | Automation webhook test successful!';
      } catch (automationError) {
        message += ` | Warning: Automation webhook test failed: ${automationError.message}`;
      }
    }
    
    return {
      message,
      ticketId
    };
  } catch (error) {
    throw new Error(`JIRA connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
