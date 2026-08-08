import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { z } from 'zod';

// Generic over the schema's output/input value types (not the schema type):
// inferring those directly keeps zodResolver from widening to FieldValues,
// which its zod-4 overload otherwise does when handed a generic schema.
type FormMethods<
  TOutput extends FieldValues,
  TInput extends FieldValues,
> = UseFormReturn<TInput, unknown, TOutput>;

interface FormProps<TOutput extends FieldValues, TInput extends FieldValues> {
  readonly schema: z.ZodType<TOutput, TInput>;
  // Receives the schema's parsed (output) values plus the RHF methods, so
  // handlers can map server errors onto fields via methods.setError.
  readonly onSubmit: (
    values: TOutput,
    methods: FormMethods<TOutput, TInput>,
  ) => unknown;
  // Render-prop exposing the RHF methods. Fields subscribe to their own state
  // via context, so reactive form state is never read here.
  readonly children: (methods: FormMethods<TOutput, TInput>) => ReactNode;
  readonly id?: string;
  readonly className?: string;
}

// Thin wrapper that binds react-hook-form to a zod schema and shares the form
// methods through context so FormTextField (and friends) self-wire. Validation
// is client-side UX; the API remains the source of truth. The input/output
// split lets schemas transform (e.g. trim) without losing types: fields
// register against the input shape, onSubmit receives the parsed output.
export function Form<TOutput extends FieldValues, TInput extends FieldValues>({
  schema,
  onSubmit,
  children,
  id,
  className,
}: Readonly<FormProps<TOutput, TInput>>) {
  const methods = useForm<TInput, unknown, TOutput>({
    resolver: zodResolver(schema),
  });

  return (
    <FormProvider {...methods}>
      <form
        className={className}
        id={id}
        noValidate
        onSubmit={methods.handleSubmit((values) => onSubmit(values, methods))}
      >
        {children(methods)}
      </form>
    </FormProvider>
  );
}
