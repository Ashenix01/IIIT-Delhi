import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, errorMessage } from "../api/client";
import DoctorCard from "../components/DoctorCard";
import { Alert, Empty, Loading, PageShell, Select } from "../components/ui";

export default function Results() {
  const { queryId } = useParams();
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") ?? "";
  const maxFee = params.get("maxFee") ?? "";

  const [state, setState] = useState({ data: null, error: "", loading: true });

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    api
      .post("/recommendations", {
        queryId,
        ...(mode ? { mode } : {}),
        ...(maxFee ? { maxFee: Number(maxFee) } : {}),
      })
      .then((res) => active && setState({ data: res.data, error: "", loading: false }))
      .catch((err) => active && setState({ data: null, error: errorMessage(err), loading: false }));
    return () => {
      active = false;
    };
  }, [queryId, mode, maxFee]);

  const setFilter = (key) => (e) => {
    const next = new URLSearchParams(params);
    if (e.target.value) next.set(key, e.target.value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const { data, error, loading } = state;

  return (
    <PageShell
      title="Doctors who can help"
      subtitle="Based on the symptoms you confirmed. This is a guide to help you choose, not a medical opinion."
    >
      <div className="mb-8 grid gap-4 sm:max-w-md sm:grid-cols-2">
        <Select label="Visit type" value={mode} onChange={setFilter("mode")}>
          <option value="">Any</option>
          <option value="ONLINE">Video visit</option>
          <option value="IN_PERSON">In person</option>
        </Select>
        <Select label="Fee up to" value={maxFee} onChange={setFilter("maxFee")}>
          <option value="">Any</option>
          <option value="300">₹300</option>
          <option value="500">₹500</option>
          <option value="800">₹800</option>
          <option value="1200">₹1,200</option>
        </Select>
      </div>

      {loading && <Loading label="Finding doctors" />}

      {error && (
        <div className="space-y-4">
          <Alert>{error}</Alert>
          <Link to="/query" className="inline-block font-medium text-teal-deep underline underline-offset-4">
            Describe your symptoms again
          </Link>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-8">
          <p className="text-[17px] text-ink-soft">
            We looked for{" "}
            {data.specialties.map((s, i) => (
              <span key={s.name}>
                {i > 0 && (i === data.specialties.length - 1 ? " and " : ", ")}
                <strong className="font-semibold text-ink">{s.name}</strong>
                {s.symptoms.length > 0 && ` (for ${s.symptoms.join(", ")})`}
              </span>
            ))}
            .
          </p>

          {data.matches.length === 0 ? (
            <Empty title="No doctors match yet">{data.emptyMessage}</Empty>
          ) : (
            <div className="space-y-5">
              {data.matches.map((m) => (
                <DoctorCard key={m.doctor.id} match={m} queryId={queryId} />
              ))}
            </div>
          )}

          <details className="rounded-2xl bg-wash p-5">
            <summary className="cursor-pointer font-medium">How are doctors ranked?</summary>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-[16px] text-ink-soft marker:text-teal">
              {data.criteria.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm text-ink-soft">{data.note}</p>
          </details>

          <p className="text-[16px] text-ink-soft">
            Need something simple done at home, like an injection or a blood pressure check?{" "}
            <Link to="/nurse" className="font-medium text-teal-deep underline underline-offset-4">
              Book a nurse visit
            </Link>
            .
          </p>
        </div>
      )}
    </PageShell>
  );
}