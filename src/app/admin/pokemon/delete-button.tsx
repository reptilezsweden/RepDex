"use client";

import { useRef, useState } from "react";
import { ConfirmSlider } from "@/components/confirm-slider";

/** Delete with the same slide-to-confirm box as the bulk actions. */
export function DeleteButton({ action, id, name }: { action: (form: FormData) => Promise<void>; id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={action} ref={formRef}>
      <input type="hidden" name="id" value={id} />
      <button type="button" className="btn danger" onClick={() => setOpen(true)}>Delete {name}</button>
      {open && (
        <ConfirmSlider
          title={`Delete ${name}?`}
          text={`${id} and every user's ticks for it will be removed.`}
          slideLabel="Slide all the way to unlock"
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => { setOpen(false); formRef.current?.requestSubmit(); }}
          onCancel={() => setOpen(false)}
        />
      )}
    </form>
  );
}
