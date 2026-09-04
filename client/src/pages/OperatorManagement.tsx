import { useState, useEffect, useMemo } from "react";
import { api } from "@/services/api";
import type { Operator } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  Users,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  UserCheck,
  Building2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface TravelerUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ITEMS_PER_PAGE = 8;

export function OperatorManagement() {
  const [activeTab, setActiveTab] = useState<"operators" | "users">("operators");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [users, setUsers] = useState<TravelerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchOperators = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api("/admin/operators");
      setOperators(data || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchUsers = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api("/admin/users");
      setUsers(data || []);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOperators(), fetchUsers()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchQuery]);

  const toggleOperatorStatus = async (op: Operator) => {
    const isCurrentlyActive = op.isActive !== false;
    const action = isCurrentlyActive ? "suspend" : "activate";
    const actionLabel = isCurrentlyActive ? "revoke access for" : "grant access to";

    if (!confirm(`Are you sure you want to ${actionLabel} ${op.name}?`)) return;

    setActionInProgress(op.id);
    try {
      await api(`/admin/operators/${op.id}/${action}`, { method: "POST" });
      await fetchOperators(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update operator status";
      alert(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleUserStatus = async (user: TravelerUser) => {
    const isCurrentlyActive = user.isActive !== false;
    const action = isCurrentlyActive ? "suspend" : "activate";
    const actionLabel = isCurrentlyActive ? "revoke access for" : "grant access to";

    if (!confirm(`Are you sure you want to ${actionLabel} ${user.name} (${user.email})?`)) return;

    setActionInProgress(user.id);
    try {
      await api(`/admin/users/${user.id}/${action}`, { method: "POST" });
      await fetchUsers(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update user status";
      alert(msg);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredOperators = useMemo(() => {
    return operators.filter((op) => {
      const q = searchQuery.toLowerCase();
      return op.name.toLowerCase().includes(q) || op.email.toLowerCase().includes(q);
    });
  }, [operators, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    });
  }, [users, searchQuery]);

  const currentList = activeTab === "operators" ? filteredOperators : filteredUsers;
  const totalPages = Math.max(1, Math.ceil(currentList.length / ITEMS_PER_PAGE));
  const paginatedList = currentList.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin")}
            className="rounded-xl h-10 w-10 border-border/80 shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Access & Account Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review incoming operator applications, grant verified access, and manage user permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1.5 rounded-2xl border border-border/40">
          <Button
            variant={activeTab === "operators" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("operators")}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" />
            Transit Operators ({operators.length})
          </Button>
          <Button
            variant={activeTab === "users" ? "default" : "ghost"}
            size="sm"
            onClick={() => setActiveTab("users")}
            className="rounded-xl text-xs font-semibold gap-1.5"
          >
            <Users className="w-3.5 h-3.5" />
            Travelers ({users.length})
          </Button>
        </div>
      </div>

      <div className="p-6 rounded-3xl bg-card/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
          <div className="flex items-center gap-2">
            {activeTab === "operators" ? (
              <Building2 className="w-4 h-4 text-primary" />
            ) : (
              <UserCheck className="w-4 h-4 text-primary" />
            )}
            <h2 className="text-sm font-bold uppercase tracking-wider">
              {activeTab === "operators" ? "Registered Operators Directory" : "Traveler Accounts Directory"}
            </h2>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder={activeTab === "operators" ? "Search operator or email..." : "Search traveler..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 bg-background/60 border-border/70 rounded-xl text-xs"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Loading account records...</p>
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-muted/30 border border-border/50 flex items-center justify-center mx-auto text-muted-foreground">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-foreground">No accounts found</p>
            <p className="text-xs text-muted-foreground">No records match your search query.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/40 overflow-hidden">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/40 hover:bg-transparent">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Account / Organization</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Email Address</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Created</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Access Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTab === "operators"
                    ? (paginatedList as Operator[]).map((op) => {
                      const isActive = op.isActive !== false;
                      const isActing = actionInProgress === op.id;

                      return (
                        <TableRow key={op.id} className={`border-border/40 hover:bg-accent/20 ${!isActive ? "opacity-75" : ""}`}>
                          <TableCell className="font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                                {op.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-foreground">{op.name}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">ID: {op.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{op.email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {op.createdAt ? format(new Date(op.createdAt), "MMM d, yyyy") : "Pre-seeded"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-md ${isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                }`}
                            >
                              {isActive ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <ShieldAlert className="w-3 h-3" /> Pending / Suspended
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isActing}
                                onClick={() => toggleOperatorStatus(op)}
                                className="rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-3"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                    Revoke Access
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isActing}
                                onClick={() => toggleOperatorStatus(op)}
                                className="rounded-xl text-xs font-semibold bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground h-8 px-3"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Grant Access
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                    : (paginatedList as TravelerUser[]).map((user) => {
                      const isActive = user.isActive !== false;
                      const isActing = actionInProgress === user.id;

                      return (
                        <TableRow key={user.id} className={`border-border/40 hover:bg-accent/20 ${!isActive ? "opacity-75" : ""}`}>
                          <TableCell className="font-semibold text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-secondary/30 border border-border/40 flex items-center justify-center text-foreground font-bold text-xs">
                                {user.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-foreground">{user.name}</div>
                                <div className="text-[10px] font-mono text-muted-foreground">ID: {user.id.slice(0, 8)}...</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{user.email}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {user.createdAt ? format(new Date(user.createdAt), "MMM d, yyyy") : "Pre-seeded"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-md ${isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                  : "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                }`}
                            >
                              {isActive ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3" /> Active
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="w-3 h-3" /> Revoked
                                </span>
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {isActive ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={isActing}
                                onClick={() => toggleUserStatus(user)}
                                className="rounded-xl text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive h-8 px-3"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-3.5 h-3.5 mr-1" />
                                    Revoke Access
                                  </>
                                )}
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isActing}
                                onClick={() => toggleUserStatus(user)}
                                className="rounded-xl text-xs font-semibold bg-primary/10 border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground h-8 px-3"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Grant Access
                                  </>
                                )}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <p className="text-xs text-muted-foreground font-mono">
                Showing {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, currentList.length)} of {currentList.length} accounts
              </p>

              {totalPages > 1 && (
                <Pagination className="justify-end w-auto mx-0">
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      />
                    </PaginationItem>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                      if (totalPages > 6 && Math.abs(p - page) > 2 && p !== 1 && p !== totalPages) {
                        if (p === 2 || p === totalPages - 1) {
                          return (
                            <PaginationItem key={p}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      }
                      return (
                        <PaginationItem key={p}>
                          <PaginationLink
                            isActive={p === page}
                            onClick={() => setPage(p)}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default OperatorManagement;
