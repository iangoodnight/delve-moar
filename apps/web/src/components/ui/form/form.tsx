import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { z } from 'zod';

type FormMethods<TSchema extends z.ZodType<FieldValues, FieldValues>> =
  UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>>;

interface FormProps<TSchema extends z.ZodType<FieldValues, FieldValues>> {
  readonly schema: TSchema;
  // Receives the schema's parsed (output) values plus the RHF methods, so
  // handlers can map server errors onto fields via methods.setError.
  readonly onSubmit: (
    values: z.output<TSchema>,
    methods: FormMethods<TSchema>,
  ) => unknown;
  // Render-prop exposing the RHF methods. Fields subscribe to their own state
  // via context, so reactive form state is never read here.
  readonly children: (methods: FormMethods<TSchema>) => ReactNode;
  readonly id?: string;
  readonly className?: string;
}

// Thin wrapper that binds react-hook-form to a zod schema and shares the form
// methods through context so FormTextField (and friends) self-wire. Validation
// is client-side UX; the API remains the source of truth. The input/output
// split lets schemas transform (e.g. trim) without losing types: fields
// register against the input shape, onSubmit receives the parsed output.
export function Form<TSchema extends z.ZodType<FieldValues, FieldValues>>({
  schema,
  onSubmit,
  children,
  id,
  className,
}: Readonly<FormProps<TSchema>>) {
  const methods = useForm<z.input<TSchema>, unknown, z.output<TSchema>>({
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
