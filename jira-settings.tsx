
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Settings, TestTube, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const jiraSettingsSchema = z.object({
  enabled: z.boolean(),
  webhookUrl: z.string().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty when disabled
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Please enter a valid JIRA API URL').optional().or(z.literal('')),
  automationWebhookUrl: z.string().refine((val) => {
    if (!val || val.trim() === '') return true; // Allow empty
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  }, 'Please enter a valid automation webhook URL').optional().or(z.literal('')),
  enableAutomation: z.boolean().optional(),
  projectKey: z.string().optional().or(z.literal('')),
  issueTypeId: z.string().optional().or(z.literal('')),
  priorityMapping: z.object({
    Low: z.string().optional().or(z.literal('')),
    Medium: z.string().optional().or(z.literal('')),
    High: z.string().optional().or(z.literal('')),
    Critical: z.string().optional().or(z.literal('')),
  }),
  customFields: z.string().refine((val) => {
    if (!val || val.trim() === '') return true;
    try {
      JSON.parse(val);
      return true;
    } catch {
      return false;
    }
  }, 'Custom fields must be valid JSON or empty').optional().or(z.literal('')),
  authentication: z.object({
    type: z.enum(['none', 'basic', 'token']),
    username: z.string().optional().or(z.literal('')),
    password: z.string().optional().or(z.literal('')),
    token: z.string().optional().or(z.literal('')),
  }),
});

type JiraSettingsFormValues = z.infer<typeof jiraSettingsSchema>;

export default function JiraSettings() {
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();

  const form = useForm<JiraSettingsFormValues>({
    resolver: zodResolver(jiraSettingsSchema),
    defaultValues: {
      enabled: false,
      webhookUrl: '',
      automationWebhookUrl: '',
      enableAutomation: false,
      projectKey: '',
      issueTypeId: '',
      priorityMapping: {
        Low: '4',
        Medium: '3',
        High: '2',
        Critical: '1',
      },
      customFields: '',
      authentication: {
        type: 'none',
        username: '',
        password: '',
        token: '',
      },
    },
  });

  // Fetch current JIRA settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/jira-settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/jira-settings', {
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null; // No settings found, use defaults
        }
        throw new Error('Failed to fetch JIRA settings');
      }
      return response.json();
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  // Save JIRA settings
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: JiraSettingsFormValues) => {
      const response = await fetch('/api/admin/jira-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save JIRA settings');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "JIRA webhook settings have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Test automation webhook
  const testAutomationMutation = useMutation({
    mutationFn: async () => {
      const formData = form.getValues();
      const response = await fetch('/api/admin/jira-settings/test-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          automationWebhookUrl: formData.automationWebhookUrl
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Automation test failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Automation Test Successful",
        description: "JIRA automation webhook is working correctly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Automation Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestAutomation = () => {
    testAutomationMutation.mutate();
  };

  // Test JIRA connection
  const testConnectionMutation = useMutation({
    mutationFn: async () => {
      const formData = form.getValues();
      const response = await fetch('/api/admin/jira-settings/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Test failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setTestResult({ success: true, message: data.message });
      toast({
        title: "Connection Test Successful",
        description: "JIRA webhook is working correctly.",
      });
    },
    onError: (error: Error) => {
      setTestResult({ success: false, message: error.message });
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JiraSettingsFormValues) => {
    saveSettingsMutation.mutate(data);
  };

  const handleTestConnection = () => {
    testConnectionMutation.mutate();
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">JIRA Integration Settings</h1>
        <p className="text-muted-foreground">
          Configure JIRA webhook integration to automatically create tickets from reported issues.
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
          <TabsTrigger value="test">
            <TestTube className="mr-2 h-4 w-4" />
            Test & Help
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Configuration</CardTitle>
                  <CardDescription>
                    Enable JIRA integration and configure the webhook endpoint.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable JIRA Integration</FormLabel>
                          <FormDescription>
                            Automatically create JIRA tickets when users report issues.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JIRA API URL*</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://your-domain.atlassian.net/rest/api/2/issue"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          The JIRA REST API endpoint for creating issues. For Atlassian Cloud: https://your-domain.atlassian.net/rest/api/2/issue
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="automationWebhookUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>JIRA Automation Webhook URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://automation.atlassian.com/pro/hooks/..."
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Optional: JIRA Automation webhook URL for triggering automation rules. Get this from JIRA Automation → Create Rule → Webhook trigger.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="enableAutomation"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enable JIRA Automation</FormLabel>
                          <FormDescription>
                            Use JIRA Automation webhooks for advanced workflow automation.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="projectKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Project Key*</FormLabel>
                          <FormControl>
                            <Input placeholder="SUPPORT" {...field} />
                          </FormControl>
                          <FormDescription>
                            The JIRA project key where issues will be created.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="issueTypeId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Issue Type ID</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} />
                          </FormControl>
                          <FormDescription>
                            JIRA issue type ID (leave empty for default).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Authentication</CardTitle>
                  <CardDescription>
                    Configure authentication for JIRA API access.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="authentication.type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Authentication Type</FormLabel>
                        <select 
                          className="w-full p-2 border rounded-md"
                          value={field.value}
                          onChange={field.onChange}
                        >
                          <option value="none">None</option>
                          <option value="basic">Basic Auth</option>
                          <option value="token">API Token</option>
                        </select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch('authentication.type') === 'basic' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="authentication.username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="your-username" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="authentication.password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  {form.watch('authentication.type') === 'token' && (
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="authentication.username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="your-email@company.com" {...field} />
                            </FormControl>
                            <FormDescription>
                              Your JIRA account email address.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="authentication.token"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>API Token</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Your JIRA API token" {...field} />
                            </FormControl>
                            <FormDescription>
                              Generate an API token from your JIRA profile settings.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Mapping</CardTitle>
                  <CardDescription>
                    Map application priority levels to JIRA priority IDs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="priorityMapping.Low"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Low Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="4" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityMapping.Medium"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Medium Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="3" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityMapping.High"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>High Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="2" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priorityMapping.Critical"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Critical Priority ID</FormLabel>
                          <FormControl>
                            <Input placeholder="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Configuration</CardTitle>
                  <CardDescription>
                    Optional custom fields and additional settings.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="customFields"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Custom Fields (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder='{"customfield_10001": "value", "customfield_10002": "another value"}'
                            className="font-mono text-sm"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Additional JIRA custom fields to include when creating tickets (JSON format).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={saveSettingsMutation.isPending}
                  className="flex-1"
                >
                  {saveSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="test" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Test JIRA Connection</CardTitle>
              <CardDescription>
                Test your JIRA webhook configuration to ensure it's working correctly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button 
                  onClick={handleTestConnection}
                  disabled={testConnectionMutation.isPending || !form.watch('enabled')}
                  className="w-full"
                >
                  {testConnectionMutation.isPending ? 'Testing...' : 'Test JIRA Connection'}
                </Button>

                {form.watch('enableAutomation') && form.watch('automationWebhookUrl') && (
                  <Button 
                    onClick={handleTestAutomation}
                    disabled={testAutomationMutation.isPending}
                    variant="outline"
                    className="w-full"
                  >
                    {testAutomationMutation.isPending ? 'Testing...' : 'Test Automation Webhook'}
                  </Button>
                )}
              </div>

              {testResult && (
                <Alert className={testResult.success ? 'border-green-500' : 'border-red-500'}>
                  {testResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <AlertDescription>
                    {testResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Setup Instructions</CardTitle>
              <CardDescription>
                Follow these steps to configure JIRA integration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">1</Badge>
                  <div>
                    <p className="font-medium">Create API Token</p>
                    <p className="text-sm text-muted-foreground">
                      Go to <a href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Atlassian Account Settings</a> → Security → Create and manage API tokens
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">2</Badge>
                  <div>
                    <p className="font-medium">Get Project Key</p>
                    <p className="text-sm text-muted-foreground">
                      In JIRA, go to Project Settings → Details. The project key is displayed (e.g., SUPPORT, HELP, IT)
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">3</Badge>
                  <div>
                    <p className="font-medium">Configure API URL</p>
                    <p className="text-sm text-muted-foreground">
                      For Atlassian Cloud: https://your-domain.atlassian.net/rest/api/2/issue<br/>
                      For Server/Data Center: https://your-jira-server.com/rest/api/2/issue
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">4</Badge>
                  <div>
                    <p className="font-medium">Set Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Use email + API token for Cloud, or username + password for Server
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">5</Badge>
                  <div>
                    <p className="font-medium">Set Up JIRA Automation (Optional)</p>
                    <p className="text-sm text-muted-foreground">
                      In JIRA → Automation → Create Rule → When "Incoming webhook" → Copy webhook URL
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Badge variant="outline" className="mt-1">6</Badge>
                  <div>
                    <p className="font-medium">Test Connection</p>
                    <p className="text-sm text-muted-foreground">
                      Use the test button above to verify your configuration works
                    </p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> Make sure your JIRA user has permission to create issues in the specified project.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
