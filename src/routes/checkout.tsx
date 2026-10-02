import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, ChevronDown, Copy, Loader2, LockKeyhole } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/store/SiteHeader";
import type { CartItem } from "@/lib/cart";
import { readCheckoutItems } from "@/lib/checkout";
import { formatBRL } from "@/lib/format";
import {
  checkPixStatus,
  createPixCharge,
  type PixChargeResult,
  type PixStatusResult,
} from "@/lib/payment";
import {
  findShipping,
  shippingOptions,
  type ShippingId,
  type ShippingOption,
} from "@/lib/shipping";
import { store } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: `Finalizar Compra | ${store.name.toUpperCase()}` },
      { name: "robots", content: "noindex" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  component: CheckoutPage,
});

const GREEN = "#3FCB13";
const PAYMENT_ICONS = ["aura", "discover", "mastercard", "diners", "visa", "amex", "pix", "elo"];

type Step = 1 | 2 | 3;

type Customer = { name: string; email: string; phone: string };
type Address = {
  zipcode: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string;
  city: string;
  state: string;
};

type FieldKey =
  "name" | "email" | "phone" | "zipcode" | "street" | "number" | "neighborhood" | "cpf";
type Errors = Partial<Record<FieldKey, string>>;

function detectDevice(): "android" | "ios" | "web" {
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return "android";
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  return "web";
}

const digits = (v: string) => v.replace(/\D/g, "");

function maskPhone(v: string) {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskZip(v: string) {
  const d = digits(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

function maskCpf(v: string) {
  const d = digits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

function validCpf(v: string) {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

function CheckoutPage() {
  const [items, setItems] = useState<CartItem[] | null>(null);

  useEffect(() => {
    setItems(readCheckoutItems());
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-white font-['Inter',sans-serif] text-[#0F172A]">
      <header className="flex justify-center px-4 py-6 md:py-8">
        <div className="scale-125 md:scale-150">
          <Logo />
        </div>
      </header>

      {items === null ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <p className="text-[15px] font-medium">Seu carrinho está vazio.</p>
          <Link
            to="/"
            className="rounded-[0.5rem] px-6 py-3 text-sm font-bold text-white"
            style={{ background: GREEN }}
          >
            Voltar para a loja
          </Link>
        </div>
      ) : (
        <CheckoutForm items={items} />
      )}

      <CheckoutFooter />
    </div>
  );
}

function CheckoutForm({ items }: { items: CartItem[] }) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [customer, setCustomer] = useState<Customer>({ name: "", email: "", phone: "" });
  const [address, setAddress] = useState<Address>({
    zipcode: "",
    street: "",
    number: "",
    neighborhood: "",
    complement: "",
    city: "",
    state: "",
  });
  const [shippingId, setShippingId] = useState<ShippingId>("gratis");
  const [cpf, setCpf] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [zipStatus, setZipStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [paying, setPaying] = useState(false);
  const [pix, setPix] = useState<Extract<PixChargeResult, { ok: true }> | null>(null);
  const addressRef = useRef<HTMLDivElement>(null);
  const paymentRef = useRef<HTMLDivElement>(null);

  const subtotal = items.reduce(
    (s, i) => s + (i.product.salePrice ?? i.product.price) * i.quantity,
    0,
  );
  // O frete só entra no total depois que o CEP foi informado.
  const shipping = zipStatus === "found" || step === 3 ? findShipping(shippingId)! : null;
  const total = subtotal + (shipping?.price ?? 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  const clearError = (key: FieldKey) =>
    setErrors((e) => {
      if (!e[key]) return e;
      const { [key]: _, ...rest } = e;
      return rest;
    });

  const submitIdentification = () => {
    const next: Errors = {};
    if (customer.name.trim().split(/\s+/).length < 2) next.name = "Digite seu nome completo";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email.trim()))
      next.email = "Digite um e-mail válido";
    if (!validCpf(cpf)) next.cpf = "Digite um CPF válido";
    if (digits(customer.phone).length < 10) next.phone = "Digite um celular válido";
    setErrors(next);
    if (Object.keys(next).length) return;
    setStep(2);
    setTimeout(
      () => addressRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const lookupZip = async (zip: string) => {
    setZipStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${zip}/json/`);
      const data = await res.json();
      if (data.erro) throw new Error("not found");
      setAddress((a) => ({
        ...a,
        street: data.logradouro || a.street,
        neighborhood: data.bairro || a.neighborhood,
        city: data.localidade,
        state: data.uf,
      }));
      setZipStatus("found");
    } catch {
      setZipStatus("error");
    }
  };

  const onZipChange = (value: string) => {
    const masked = maskZip(value);
    setAddress((a) => ({ ...a, zipcode: masked }));
    clearError("zipcode");
    if (digits(masked).length === 8) void lookupZip(digits(masked));
    else setZipStatus("idle");
  };

  const submitAddress = () => {
    const next: Errors = {};
    if (zipStatus !== "found") next.zipcode = "Digite um CEP válido";
    if (!address.street.trim()) next.street = "Digite o endereço";
    if (!address.number.trim()) next.number = "Obrigatório";
    if (!address.neighborhood.trim()) next.neighborhood = "Digite o bairro";
    setErrors(next);
    if (Object.keys(next).length) return;
    setStep(3);
    setTimeout(
      () => paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
      50,
    );
  };

  const submitPayment = async () => {
    setPaying(true);
    try {
      const result = await createPixCharge({
        data: {
          items: items.map((i) => ({ id: i.product.id, quantity: i.quantity })),
          shippingId,
          device: detectDevice(),
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: digits(customer.phone),
            document: digits(cpf),
          },
          address: {
            zipcode: digits(address.zipcode),
            street: address.street.trim(),
            number: address.number.trim(),
            neighborhood: address.neighborhood.trim(),
            complement: address.complement.trim() || undefined,
            city: address.city,
            state: address.state,
          },
        },
      });
      if (result.ok) setPix(result);
      else toast.error(result.error);
    } catch {
      toast.error("Não foi possível gerar o PIX. Tente novamente.");
    }
    setPaying(false);
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl flex-1 px-0 md:mb-10 lg:max-w-[74rem]">
      <div className="relative px-0 md:px-3.5 lg:mt-6 lg:grid lg:grid-cols-3 lg:gap-x-4 lg:px-3">
        <MobileSummary
          items={items}
          subtotal={subtotal}
          shipping={shipping}
          total={total}
          count={count}
        />

        {/* Coluna 1: Identificação + Entrega */}
        <div>
          <StepCard
            active={step === 1}
            done={step > 1}
            title="Identificação"
            counter="1 de 3"
            subtitle="Preencha seus dados para envio do pedido."
            onEdit={() => {
              setPix(null);
              setStep(1);
            }}
            summary={
              <>
                <p className="font-medium text-[#0F172A]">{customer.name}</p>
                <p>{customer.email}</p>
                <p>CPF {cpf}</p>
                <p>+55 {customer.phone}</p>
              </>
            }
          >
            <Field label="Nome completo" htmlFor="name" error={errors.name}>
              <Input
                id="name"
                autoComplete="name"
                placeholder="Digite seu nome completo"
                value={customer.name}
                invalid={!!errors.name}
                onChange={(v) => {
                  setCustomer((c) => ({ ...c, name: v }));
                  clearError("name");
                }}
              />
            </Field>
            <Field label="E-mail" htmlFor="email" error={errors.email}>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Digite seu e-mail"
                value={customer.email}
                invalid={!!errors.email}
                onChange={(v) => {
                  setCustomer((c) => ({ ...c, email: v }));
                  clearError("email");
                }}
              />
            </Field>
            <Field label="CPF" htmlFor="cpf" error={errors.cpf}>
              <Input
                id="cpf"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={cpf}
                invalid={!!errors.cpf}
                onChange={(v) => {
                  setCpf(maskCpf(v));
                  clearError("cpf");
                }}
              />
            </Field>
            <Field
              label="Celular/Whatsapp"
              htmlFor="phone"
              error={errors.phone}
              className="w-[75%]"
            >
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-[13px] text-slate-500">
                  +55
                </span>
                <Input
                  id="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="(00) 00000-0000"
                  className="pl-12"
                  value={customer.phone}
                  invalid={!!errors.phone}
                  onChange={(v) => {
                    setCustomer((c) => ({ ...c, phone: maskPhone(v) }));
                    clearError("phone");
                  }}
                />
              </div>
            </Field>
            <GreenButton onClick={submitIdentification}>Ir Para Entrega</GreenButton>
          </StepCard>

          <div ref={addressRef} className="mt-5 scroll-mt-4">
            <StepCard
              active={step === 2}
              done={step > 2}
              title="Entrega"
              counter="2 de 3"
              subtitle={
                step === 2 ? "Informe o endereço de entrega." : "Preencha seus dados para continuar"
              }
              onEdit={() => {
                setPix(null);
                setStep(2);
              }}
              summary={
                <>
                  <p className="font-medium text-[#0F172A]">
                    {address.street}, {address.number}
                    {address.complement ? ` - ${address.complement}` : ""}
                  </p>
                  <p>
                    {address.neighborhood} - {address.city}/{address.state}
                  </p>
                  <p>CEP {address.zipcode}</p>
                  <p className="mt-2 font-medium text-[#0F172A]">
                    {shipping?.name} · {shipping?.eta} ·{" "}
                    {shipping?.price ? formatBRL(shipping.price) : "Grátis"}
                  </p>
                </>
              }
            >
              <Field label="CEP" htmlFor="zipcode" error={errors.zipcode} className="mt-4">
                <div className="mt-1 flex items-center gap-4">
                  <Input
                    id="zipcode"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    placeholder="00000-000"
                    className="w-[160px]"
                    value={address.zipcode}
                    invalid={!!errors.zipcode || zipStatus === "error"}
                    onChange={onZipChange}
                  />
                  {zipStatus === "loading" && (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  )}
                  {zipStatus === "found" && (
                    <span className="text-[12px] text-slate-600">
                      {address.city}/{address.state}
                    </span>
                  )}
                </div>
                {zipStatus === "error" && !errors.zipcode && (
                  <p className="mt-1 text-[12px] text-red-600">CEP não encontrado</p>
                )}
              </Field>

              {zipStatus === "found" && (
                <>
                  <Field
                    label="Endereço"
                    htmlFor="street"
                    error={errors.street}
                    className="mt-3 mb-4"
                  >
                    <Input
                      id="street"
                      autoComplete="street-address"
                      placeholder="Digite rua, avenida, travessa..."
                      value={address.street}
                      invalid={!!errors.street}
                      onChange={(v) => {
                        setAddress((a) => ({ ...a, street: v }));
                        clearError("street");
                      }}
                    />
                  </Field>
                  <div className="mb-3 grid grid-cols-4 gap-2">
                    <Field
                      label="N°"
                      htmlFor="number"
                      error={errors.number}
                      className="col-span-1 mt-0"
                    >
                      <Input
                        id="number"
                        placeholder="Número"
                        value={address.number}
                        invalid={!!errors.number}
                        onChange={(v) => {
                          setAddress((a) => ({ ...a, number: v }));
                          clearError("number");
                        }}
                      />
                    </Field>
                    <Field
                      label="Bairro"
                      htmlFor="neighborhood"
                      error={errors.neighborhood}
                      className="col-span-3 mt-0"
                    >
                      <Input
                        id="neighborhood"
                        placeholder="Digite o bairro"
                        value={address.neighborhood}
                        invalid={!!errors.neighborhood}
                        onChange={(v) => {
                          setAddress((a) => ({ ...a, neighborhood: v }));
                          clearError("neighborhood");
                        }}
                      />
                    </Field>
                  </div>
                  <Field
                    label={
                      <>
                        Complemento{" "}
                        <span className="text-[11px] font-medium text-[#8F8F8F]">(Opcional)</span>
                      </>
                    }
                    htmlFor="complement"
                    className="mt-4"
                  >
                    <Input
                      id="complement"
                      maxLength={100}
                      value={address.complement}
                      onChange={(v) => setAddress((a) => ({ ...a, complement: v }))}
                    />
                  </Field>
                </>
              )}

              <fieldset className="mt-6 mb-5">
                <legend className="font-semibold text-slate-900">Escolha o frete:</legend>
                {zipStatus === "found" ? (
                  <div className="mt-4 space-y-3">
                    {shippingOptions.map((opt) => {
                      const selected = opt.id === shippingId;
                      return (
                        <label
                          key={opt.id}
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-[0.5rem] border p-3",
                            !selected && "border-[#E2E8F0]",
                          )}
                          style={selected ? { borderColor: GREEN } : undefined}
                        >
                          <input
                            type="radio"
                            name="shipping"
                            value={opt.id}
                            checked={selected}
                            onChange={() => setShippingId(opt.id)}
                            className="sr-only"
                          />
                          <Radio checked={selected} />
                          <span className="flex flex-1 flex-col">
                            <span className="text-[13px] font-medium text-black">{opt.name}</span>
                            <span className="text-[12px] text-slate-500">{opt.eta}</span>
                          </span>
                          <span
                            className="text-[13px] font-semibold"
                            style={{ color: opt.price ? "#000" : GREEN }}
                          >
                            {opt.price ? formatBRL(opt.price) : "Grátis"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center justify-center rounded-lg border border-[#F5F5F5] bg-[#F5F5F5] p-4 text-center text-[12px] font-normal text-[#707070]">
                    Insira o endereço de entrega para ver as formas de frete disponíveis.
                  </div>
                )}
              </fieldset>

              <GreenButton onClick={submitAddress}>Ir Para Pagamento</GreenButton>
            </StepCard>
          </div>
        </div>

        {/* Coluna 2: Pagamento */}
        <div ref={paymentRef} className="mt-6 mb-12 scroll-mt-4 lg:mt-0">
          <StepCard
            active={step === 3}
            done={false}
            title="Pagamento"
            counter="3 de 3"
            subtitle={
              step === 3
                ? "Escolha a forma de pagamento."
                : "Preencha os dados de entrega para continuar"
            }
          >
            {pix ? (
              <PixResult pix={pix} onPaid={() => navigate({ to: "/obrigado" })} />
            ) : (
              <>
                <div className="mt-4 flex w-full items-center gap-3 rounded-[0.5rem] bg-white p-3 ring-1 ring-[#3FCB13]">
                  <Radio checked />
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                    <PixIcon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-black">PIX</span>
                </div>
                <ul className="mt-4 space-y-1.5 text-[12px] text-slate-600">
                  <li>• Pagamento aprovado na hora</li>
                  <li>• O código PIX é válido por 30 minutos</li>
                </ul>
                <div className="mt-5 flex items-center justify-between text-[15px] font-bold text-black">
                  <span>Total</span>
                  <span>{formatBRL(total)}</span>
                </div>
                <GreenButton onClick={() => void submitPayment()} disabled={paying}>
                  {paying ? <Loader2 className="h-5 w-5 animate-spin" /> : "Finalizar Compra"}
                </GreenButton>
              </>
            )}
          </StepCard>
        </div>

        {/* Coluna 3: Resumo (desktop) */}
        <div className="hidden lg:block">
          <div className="rounded-[0.5rem] border border-[#E2E8F0] bg-white md:p-6">
            <h2 className="text-[15px] font-medium text-black">Resumo do pedido</h2>
            <span className="mb-5 flex" />
            <SummaryBody items={items} subtotal={subtotal} shipping={shipping} total={total} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({
  active,
  done,
  title,
  counter,
  subtitle,
  summary,
  onEdit,
  children,
}: {
  active: boolean;
  done: boolean;
  title: string;
  counter: string;
  subtitle: string;
  summary?: ReactNode;
  onEdit?: () => void;
  children: ReactNode;
}) {
  const idle = !active && !done;
  return (
    <div
      className={cn(
        "rounded-[0.5rem] border p-[1rem] md:p-[1.65rem]",
        idle ? "border-[#F9FAFB] bg-[#F9FAFB]" : "border-[#E2E8F0] bg-white",
      )}
    >
      <h2
        className={cn(
          "flex items-center justify-between gap-2 text-lg font-semibold",
          idle ? "text-[#6B7280]" : "text-[#0F172A]",
        )}
      >
        <span className="flex items-center gap-2">
          {done && (
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full text-white"
              style={{ background: GREEN }}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
          )}
          {title}
        </span>
        {done && onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="text-[12px] font-medium text-[#0F172A] underline underline-offset-2"
          >
            Editar
          </button>
        ) : (
          <span className="text-[12px] font-medium">{counter}</span>
        )}
      </h2>
      {done ? (
        <div className="mt-3 space-y-0.5 text-[13px] text-slate-600">{summary}</div>
      ) : (
        <p
          className={cn(
            "text-[13px] font-normal",
            active ? "pb-5 text-[#0F172A]" : "mt-1 text-[#6B7280]",
          )}
        >
          {subtitle}
        </p>
      )}
      {active && children}
    </div>
  );
}

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
      style={{ borderColor: checked ? GREEN : "#CBD5E1" }}
    >
      {checked && <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />}
    </span>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: ReactNode;
  htmlFor: string;
  error?: string | undefined;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mt-3", className)}>
      <label className="text-[13px] font-medium leading-none" htmlFor={htmlFor}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
      {error && <p className="mt-1 text-[12px] text-red-600">{error}</p>}
    </div>
  );
}

function Input({
  onChange,
  invalid,
  className,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & {
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <input
      {...props}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "flex h-[46px] w-full rounded-[0.5rem] border bg-white px-3 py-1 text-[13px] transition-colors placeholder:text-slate-400 focus-visible:border-black focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-black",
        invalid ? "border-red-500" : "border-[#dedede]",
        className,
      )}
    />
  );
}

function GreenButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-5 flex h-14 w-full items-center justify-center gap-2 rounded-[0.5rem] px-4 py-2 text-base font-bold text-white shadow transition-colors hover:shadow-md hover:brightness-110 disabled:opacity-80"
      style={{ background: GREEN }}
    >
      {children}
    </button>
  );
}

type SummaryProps = {
  items: CartItem[];
  subtotal: number;
  shipping: ShippingOption | null;
  total: number;
};

function SummaryBody({ items, subtotal, shipping, total }: SummaryProps) {
  return (
    <>
      <dl className="mb-4 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <dt className="text-[13px] text-black">Produtos</dt>
          <dd className="text-[13px] text-black">{formatBRL(subtotal)}</dd>
        </div>
        {shipping && (
          <div className="mt-2 flex items-center justify-between">
            <dt className="text-[13px] text-black">Frete</dt>
            <dd className="text-[13px]" style={{ color: shipping.price ? "#000" : GREEN }}>
              {shipping.price ? formatBRL(shipping.price) : "Grátis"}
            </dd>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <dt className="text-[15px] font-bold text-black">Total</dt>
          <dd className="text-[15px] font-bold text-black">{formatBRL(total)}</dd>
        </div>
      </dl>
      <ul role="list" className="divide-y divide-slate-200">
        {items.map((i) => (
          <li key={i.product.id} className="flex items-start gap-3 py-3">
            <div className="flex-shrink-0 rounded-lg border border-slate-200 bg-white p-[0.2rem] shadow-sm">
              {i.product.image ? (
                <img
                  src={i.product.image}
                  alt={i.product.name}
                  width={48}
                  height={48}
                  className="h-12 w-12 rounded-lg object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-lg bg-slate-100" />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="block min-w-0 break-words text-[13px] leading-tight font-normal text-black">
                {i.product.name}
              </span>
              {i.quantity > 1 && (
                <span className="text-[12px] text-slate-500">Qtd: {i.quantity}</span>
              )}
            </div>
            <span className="whitespace-nowrap text-[13px] font-normal text-black">
              {formatBRL((i.product.salePrice ?? i.product.price) * i.quantity)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

function MobileSummary({ count, ...summary }: SummaryProps & { count: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="sticky top-0 z-20 lg:hidden">
      <div className="overflow-hidden border border-[#E2E8F0] bg-white md:rounded-[0.5rem]">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 bg-[#F7F7F7] py-[13px] pr-[13px] pl-[19px]"
        >
          <span className="text-[12px] font-medium text-[#111827]">Resumo do pedido ({count})</span>
          <span className="flex items-center gap-1 font-semibold text-[#030712]">
            {formatBRL(summary.total)}
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </span>
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows] duration-500 ease-in-out",
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="px-[19px] pt-5 pb-2">
              <SummaryBody {...summary} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PixResult({
  pix,
  onPaid,
}: {
  pix: Extract<PixChargeResult, { ok: true }>;
  onPaid: () => void;
}) {
  const [status, setStatus] = useState<PixStatusResult["status"]>("PENDING");
  const [checking, setChecking] = useState(false);
  const paidRef = useRef(false);

  const check = async () => {
    try {
      const result = await checkPixStatus({ data: { transactionId: pix.transactionId } });
      if (result.status !== "UNKNOWN") setStatus(result.status);
      if (result.status === "PAID" && !paidRef.current) {
        paidRef.current = true;
        onPaid();
      }
      return result.status;
    } catch {
      return "UNKNOWN" as const;
    }
  };

  // Consulta o status a cada 5s enquanto o PIX estiver pendente.
  useEffect(() => {
    if (status !== "PENDING") return;
    const timer = setInterval(() => void check(), 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, pix.transactionId]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(pix.pixCode);
      toast.success("Código PIX copiado!");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  };

  const confirm = async () => {
    setChecking(true);
    const result = await check();
    setChecking(false);
    if (result === "PENDING")
      toast.info("Ainda não recebemos seu pagamento. Aguarde alguns segundos.");
  };

  if (status === "CANCELLED" || status === "REVERSED") {
    return (
      <div className="mt-2 text-center text-[13px] text-slate-600">
        Este PIX expirou ou foi cancelado. Recarregue a página para gerar um novo código.
      </div>
    );
  }

  return (
    <div className="mt-2 flex flex-col items-center text-center">
      <p className="text-[13px] text-slate-600">
        Escaneie o QR Code ou copie o código abaixo para pagar{" "}
        <b className="text-black">{formatBRL(pix.amount)}</b>.
      </p>
      <div className="mt-4 rounded-[0.5rem] border border-[#E2E8F0] bg-white p-3">
        <QRCodeSVG value={pix.pixCode} size={192} />
      </div>
      <div className="mt-4 w-full rounded-[0.5rem] border border-[#dedede] bg-slate-50 p-3 text-left text-[11px] break-all text-slate-700 select-all">
        {pix.pixCode}
      </div>
      <GreenButton onClick={() => void copy()}>
        <Copy className="h-4 w-4" /> Copiar código PIX
      </GreenButton>
      <p className="mt-4 flex items-center gap-2 text-[12px] text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Aguardando pagamento… a confirmação é automática.
      </p>
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={checking}
        className="mt-2 text-[12px] text-slate-500 underline"
      >
        {checking ? "Verificando…" : "Já paguei"}
      </button>
    </div>
  );
}

function PixIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="308 0 36 24" className={className} aria-hidden>
      <path
        fill="#4AB7A8"
        d="M322.84 15.42c.25 0 .5-.05.73-.14.23-.1.44-.24.61-.41l1.94-1.94a.37.37 0 0 1 .51 0l1.95 1.94c.17.18.38.32.61.42.23.09.48.14.73.14h.38l-2.45 2.45a1.96 1.96 0 0 1-2.78 0l-2.47-2.46h.24Zm7.08-6.86c-.25 0-.5.05-.73.15-.23.09-.44.23-.61.41l-1.95 1.95a.37.37 0 0 1-.51 0l-1.93-1.94a1.9 1.9 0 0 0-1.35-.56h-.24l2.47-2.46a1.96 1.96 0 0 1 2.78 0l2.45 2.45h-.38Z"
      />
      <path
        fill="#4AB7A8"
        d="m320.57 10.61 1.47-1.47h.8c.35 0 .69.14.94.39l1.94 1.93a.9.9 0 0 0 1.31 0l1.95-1.94c.25-.25.59-.39.94-.39h.95l1.47 1.47a1.96 1.96 0 0 1 0 2.78l-1.47 1.47h-.95c-.35 0-.69-.14-.94-.38l-1.95-1.95a.94.94 0 0 0-1.31 0l-1.94 1.94c-.25.24-.59.38-.94.38h-.8l-1.47-1.46a1.96 1.96 0 0 1 0-2.77Z"
      />
    </svg>
  );
}

function CheckoutFooter() {
  const [info, setInfo] = useState(false);
  const icons = PAYMENT_ICONS.map((name) => (
    <img key={name} src={`/checkout/${name}.svg`} alt={name} width={37.5} height={25} />
  ));
  return (
    <footer className="mt-auto shrink-0 bg-black p-6 text-white lg:mt-4 lg:p-8">
      <div className="relative mx-auto max-w-2xl px-5 pb-10 lg:max-w-7xl">
        <div className="hidden flex-col items-center justify-center gap-1 text-center text-xs lg:flex">
          <p className="mb-1 w-full font-medium">{store.name} | Todos os direitos reservados</p>
          <p className="w-full">{store.address}</p>
          <p className="w-full">
            © {new Date().getFullYear()} {store.company} - CNPJ: {store.cnpj}
          </p>
          <p className="w-full">
            Telefone: {store.phone} / E-mail: {store.email}
          </p>
          <div className="mt-2 flex flex-col items-center gap-2">
            <p className="text-sm">Formas de pagamento:</p>
            <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-2">{icons}</span>
          </div>
          <div className="mt-5 flex items-center">
            <LockKeyhole className="mr-2 size-5" />
            <span className="text-left text-xs leading-[13px]">
              <b>PAGAMENTO</b>
              <br /> 100% SEGURO
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center gap-3 text-center text-xs lg:hidden">
          <div className="flex w-full flex-col items-center gap-2">
            <p className="text-sm font-medium">Formas de pagamento:</p>
            <span className="inline-flex flex-col items-center gap-2">
              <span className="flex justify-center gap-2">{icons.slice(0, 5)}</span>
              <span className="flex justify-center gap-2">{icons.slice(5)}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInfo((v) => !v)}
            className="text-sm underline underline-offset-2 hover:opacity-80"
          >
            Informações da loja
          </button>
          {info && (
            <div className="space-y-1">
              <p>{store.address}</p>
              <p>
                {store.company} - CNPJ: {store.cnpj}
              </p>
              <p>
                {store.phone} / {store.email}
              </p>
            </div>
          )}
          <p className="w-full text-center text-xs">{store.name} | Todos os direitos reservados</p>
        </div>
      </div>
    </footer>
  );
}
