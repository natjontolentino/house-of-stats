"use client";

/** A submit button that asks for confirmation first, for actions that can't be undone. */
export function ConfirmButton({
  message,
  children,
  formAction,
  style,
}: {
  message: string;
  children: React.ReactNode;
  formAction: (formData: FormData) => void | Promise<void>;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="submit"
      formAction={formAction}
      formNoValidate
      style={style}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
