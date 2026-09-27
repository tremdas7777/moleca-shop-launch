import { useState } from "react";
import { toast } from "sonner";

export function Newsletter() {
  const [email, setEmail] = useState("");

  return (
    <section className="bg-primary text-white">
      <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-8 lg:flex-row lg:justify-between">
        <div className="text-center lg:text-left">
          <h2 className="font-display text-2xl font-bold uppercase">
            Ganhe 10% na primeira compra
          </h2>
          <p className="text-sm text-white/80">
            Cadastre seu e-mail e receba ofertas e lançamentos.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success("Cadastro realizado! Confira seu e-mail.");
            setEmail("");
          }}
          className="flex w-full max-w-md"
        >
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu melhor e-mail"
            className="h-11 min-w-0 flex-1 bg-white px-4 text-sm text-neutral-900 outline-none"
          />
          <button className="h-11 bg-neutral-900 px-6 text-xs font-bold uppercase tracking-wider hover:bg-neutral-800">
            Cadastrar
          </button>
        </form>
      </div>
    </section>
  );
}
