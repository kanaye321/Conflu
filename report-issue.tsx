import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const issueSchema = z.object({
  issueType: z.literal('Incident'),
  priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
  summary: z.string().min(5, 'Summary must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  reporter: z.string().min(1, 'Knox ID is required'),
});

type IssueFormValues = z.infer<typeof issueSchema>;

export default function ReportIssue() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState<string>('');
  const { toast } = useToast();

  const form = useForm<IssueFormValues>({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      issueType: 'Incident',
      priority: 'Medium',
      summary: '',
      description: '',
      reporter: '',
    },
  });

  const submitIssueMutation = useMutation({
    mutationFn: async (data: IssueFormValues) => {
      // Transform data to match the expected API format
      const apiData = {
        title: data.summary,
        description: data.description,
        priority: data.priority,
        issueType: data.issueType,
        userEmail: data.reporter, // Using reporter field as Knox ID/contact
      };

      console.log('Submitting issue data:', apiData);

      const response = await fetch('/api/issues/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to submit issue';
        try {
          const error = await response.json();
          errorMessage = error.message || errorMessage;
        } catch {
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      setTicketId(data.ticketId || 'Unknown');
      form.reset();
      
      let description = `Your incident has been reported. Ticket ID: ${data.ticketId}`;
      if (data.warning) {
        description += ` (Note: ${data.warning})`;
      }
      
      toast({
        title: "Issue Submitted Successfully",
        description,
      });
    },
    onError: (error: Error) => {
      console.error('Issue submission error:', error);
      
      let errorMessage = error.message;
      if (error.message.includes('JIRA integration')) {
        errorMessage = `${error.message} Your issue may have been recorded locally. Please contact IT support.`;
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      toast({
        title: "Submission Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: IssueFormValues) => {
    submitIssueMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Incident Submitted Successfully!</CardTitle>
            <CardDescription>
              Thank you for reporting this incident. We'll investigate and get back to you soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Your ticket ID is: <strong>{ticketId}</strong>
                <br />
                Please save this ID for future reference.
              </AlertDescription>
            </Alert>
            <Button 
              onClick={() => {
                setIsSubmitted(false);
                setTicketId('');
              }}
              className="w-full"
            >
              Report Another Incident
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Report an Incident</h1>
        <p className="text-muted-foreground">
          Report incidents and issues with the system for prompt resolution.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Incident Details</CardTitle>
          <CardDescription>
            Please provide the necessary information to help us resolve the incident quickly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="issueType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue Type*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select issue type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Incident">Incident</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="summary"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Summary*</FormLabel>
                    <FormControl>
                      <Input placeholder="Brief description of the incident" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description*</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Detailed description of the incident, including what happened and when"
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="reporter"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reporter*</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your Knox ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <Button 
                  type="submit" 
                  disabled={submitIssueMutation.isPending}
                  className="flex-1"
                >
                  {submitIssueMutation.isPending ? 'Submitting...' : 'Submit Incident'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => form.reset()}
                  className="flex-1"
                >
                  Clear Form
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}