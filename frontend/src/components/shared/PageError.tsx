type Props = {
  message?: string
  onRetry?: () => void
}

export default function PageError({
  message = 'Something went wrong.',
  onRetry,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <p className="text-destructive text-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm underline text-muted-foreground hover:text-foreground"
        >
          Try again
        </button>
      )}
    </div>
  )
}