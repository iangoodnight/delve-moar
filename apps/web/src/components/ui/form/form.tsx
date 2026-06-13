import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import type {
  FieldValues,
  SubmitHandler,
  UseFormReturn,
} from 'react-hook-form';
import { FormProvider, useForm } from 'react-hook-form';
import type { z } from 'zod';

interface FormProps<TSchema extends z.ZodType<FieldValues, FieldValues>> {
  readonly schema: TSchema;
  // Receives the schema's parsed (output) values.
  readonly onSubmit: SubmitHandler<z.output<TSchema>>;
  // Render-prop exposing the RHF methods (e.g. setError for server errors).
  // Fields subscribe to their own state via context, so reactive form state
  // is never read here.
  readonly children: (
    methods: UseFormReturn<z.input<TSchema>, unknown, z.output<TSchema>>,
  ) => ReactNode;
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
        id={id}
        className={className}
        onSubmit={methods.handleSubmit(onSubmit)}
        noValidate
      >
        {children(methods)}
      </form>
    </FormProvider>
  );
}
