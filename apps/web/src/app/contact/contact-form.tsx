"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/hosts";

export function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("Product");
  const [message, setMessage] = useState("");

  function send(event: React.FormEvent) {
    event.preventDefault();
    const subject = encodeURIComponent(`[KRAFTSANDKODES] ${topic}`);
    const body = encodeURIComponent(
      `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
    );
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  }

  const field =
    "mt-1 block w-full min-w-0 max-w-full rounded-2xl border border-white/10 bg-[#121018] px-3 py-3 text-sm text-white outline-none focus:border-violet-500/50 sm:px-4";

  return (
    <form
      onSubmit={send}
      className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-[#0b0912]/80 p-4 sm:p-6"
    >
      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <label className="min-w-0 text-xs text-zinc-400">
          Name
          <input
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={field}
            autoComplete="name"
          />
        </label>
        <label className="min-w-0 text-xs text-zinc-400">
          Email
          <input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
            autoComplete="email"
          />
        </label>
      </div>
      <label className="mt-4 block min-w-0 text-xs text-zinc-400">
        Topic
        <select
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className={`${field} appearance-auto`}
        >
          <option>Product</option>
          <option>Billing</option>
          <option>Instagram / Meta</option>
          <option>Privacy / data deletion</option>
        </select>
      </label>
      <label className="mt-4 block min-w-0 text-xs text-zinc-400">
        Message
        <textarea
          required
          rows={5}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          className={`${field} resize-y`}
        />
      </label>
      <Button
        className="mt-5 h-auto min-h-11 w-full px-4 py-3 sm:w-auto"
        type="submit"
      >
        Open email app
      </Button>
      <p className="mt-3 break-all text-[11px] leading-relaxed text-zinc-500">
        Sends to {SUPPORT_EMAIL}. Opens your mail app — we do not store this
        form on the server.
      </p>
    </form>
  );
}
