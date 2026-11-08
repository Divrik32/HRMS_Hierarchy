
import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Send, RefreshCw } from "lucide-react";
import api from "../../api/axios";

const CompOff = () => {
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    workDate: "",
    requestedLeaveDate: "",
    workDescription: "",
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadRequests = useCallback(async () => {
    setFetching(true);
    try {
      const response = await api.get("/leaves/comp-off/my-requests");
      setRequests(response.data.requests || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load Comp-Off requests.");
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!form.workDate || !form.requestedLeaveDate || !form.workDescription.trim()) {
      setError("Please complete all fields.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/leaves/comp-off", form);
      setNotice("Comp-Off work request submitted to HR.");
      setForm({ workDate: "", requestedLeaveDate: "", workDescription: "" });
      await loadRequests();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit Comp-Off request.");
    } finally {
      setLoading(false);
    }
  };

  const statusClass = {
    Pending: "bg-amber-100 text-amber-700",
    Approved: "bg-blue-100 text-blue-700",
    Worked: "bg-indigo-100 text-indigo-700",
    Credited: "bg-emerald-100 text-emerald-700",
    Missed: "bg-red-100 text-red-700",
    Rejected: "bg-slate-100 text-slate-600",
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">My Comp-Off</h1>
        <p className="text-sm text-slate-500">Request approval to work on a Sunday or company holiday.</p>
      </div>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <CalendarPlus className="text-blue-600" />
          <h2 className="font-semibold">Request Comp-Off Work</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Date you will work</label>
            <input type="date" required value={form.workDate}
              onChange={(e) => setForm({ ...form, workDate: e.target.value })}
              className="w-full rounded-lg border px-3 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Requested leave date</label>
            <input type="date" required value={form.requestedLeaveDate}
              onChange={(e) => setForm({ ...form, requestedLeaveDate: e.target.value })}
              className="w-full rounded-lg border px-3 py-2.5" />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">Work description</label>
          <textarea required rows={3} value={form.workDescription}
            onChange={(e) => setForm({ ...form, workDescription: e.target.value })}
            placeholder="Describe the work you plan to complete..."
            className="w-full rounded-lg border px-3 py-2.5" />
        </div>

        <button disabled={loading} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          <Send size={16} /> {loading ? "Submitting..." : "Submit Work Request"}
        </button>
      </form>

      <section className="overflow-hidden rounded-xl border bg-white">
        <div className="flex items-center justify-between border-b p-5">
          <h2 className="font-semibold">My Comp-Off Requests</h2>
          <button onClick={loadRequests} className="flex items-center gap-2 text-sm text-slate-600">
            <RefreshCw size={15} /> Refresh
          </button>
        </div>

        {fetching ? (
          <p className="p-6 text-sm text-slate-500">Loading...</p>
        ) : requests.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No Comp-Off requests found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3">Work Date</th>
                  <th className="p-3">Requested Leave</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {requests.map((item) => (
                  <tr key={item._id}>
                    <td className="p-3">{new Date(item.workDate).toLocaleDateString()}</td>
                    <td className="p-3">{new Date(item.requestedLeaveDate).toLocaleDateString()}</td>
                    <td className="max-w-xs p-3">{item.workDescription}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass[item.status] || "bg-slate-100"}`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default CompOff;
