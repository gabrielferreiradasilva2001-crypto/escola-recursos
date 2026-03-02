"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../../lib/supabaseClient";
import styles from "./TeachersPage.module.css";
import SchoolLogo from "../../components/SchoolLogo";

type Teacher = {
  id: string;
  name: string;
  email: string | null;
  active: boolean;
  profile_type?: "admin_gestao" | "professor" | null;
  management_role?: "professor" | "estagiario" | "diretor" | "secretaria" | "coordenador" | null;
  birth_day?: number | null;
  birth_month?: number | null;
  school_ids?: string[] | null;
  class_ids?: string[] | null;
  created_at: string;
};

type ToastType = "ok" | "err";

type School = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  logo_url?: string | null;
  calendar_pdf_url?: string | null;
};
type ResourceGroup = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  school_ids?: string[] | null;
};

type ClassRow = {
  id: string;
  name: string;
  school_id: string;
  period: string;
  active: boolean;
  created_at: string;
  schools?: { name?: string } | null;
};

type ItemRow = {
  id: string;
  name: string;
  category: string;
  total_qty: number;
  school_id?: string | null;
};

type AuthUserLike = {
  user_metadata?: {
    force_password_change?: boolean;
  } | null;
} | null;
const PERIOD_OPTIONS = ["matutino", "vespertino", "noturno"] as const;

export default function TeachersPage() {
  type UserRole = "professor" | "estagiario" | "diretor" | "secretaria" | "coordenador";
  function errorMessage(err: unknown, fallback: string) {
    return err instanceof Error ? err.message : fallback;
  }

  function normalizeUsername(input: string) {
    return input
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, ".")
      .replace(/[^a-z0-9._-]/g, "")
      .replace(/\.+/g, ".")
      .replace(/^\.|\.$/g, "");
  }
  function formatUsername(value?: string | null) {
    if (!value) return "—";
    const lower = value.toLowerCase();
    if (lower.includes("@")) return lower.split("@")[0];
    return value;
  }
  const searchParams = useSearchParams();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("professor");
  const [birthDay, setBirthDay] = useState<number | "">("");
  const [birthMonth, setBirthMonth] = useState<number | "">("");
  const [schoolIds, setSchoolIds] = useState<string[]>([]);
  const [createClassIds, setCreateClassIds] = useState<string[]>([]);
  const [createClassPicker, setCreateClassPicker] = useState("");
  const [createAsAdmin, setCreateAsAdmin] = useState(false);
  const [createAdminPeriods, setCreateAdminPeriods] = useState<string[]>(["matutino"]);
  const [createAdminLocations, setCreateAdminLocations] = useState<string[]>([]);
  const [createAdminDefaultPeriod, setCreateAdminDefaultPeriod] = useState("matutino");
  const [createAdminDefaultLocation, setCreateAdminDefaultLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"users" | "classes" | "schools" | "items">("users");

  const [schools, setSchools] = useState<School[]>([]);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [bindingClasses, setBindingClasses] = useState<ClassRow[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [resourceGroupsLoading, setResourceGroupsLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(false);
  const [bindingClassesLoading, setBindingClassesLoading] = useState(false);

  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemName, setItemName] = useState("");
  const [itemCategory, setItemCategory] = useState("");
  const [itemQty, setItemQty] = useState(1);
  const [itemSchoolId, setItemSchoolId] = useState("");
  const [itemFilterSchoolId, setItemFilterSchoolId] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemSaving, setItemSaving] = useState(false);
  const [itemDeletingId, setItemDeletingId] = useState<string | null>(null);
  const [itemSearch, setItemSearch] = useState("");
  const [itemConfirmOpen, setItemConfirmOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<ItemRow | null>(null);

  const [schoolName, setSchoolName] = useState("");
  const [newSchoolName, setNewSchoolName] = useState("");
  const [newResourceGroupName, setNewResourceGroupName] = useState("");
  const [linkSchoolId, setLinkSchoolId] = useState("");
  const [linkGroupId, setLinkGroupId] = useState("");
  const [schoolLogoFile, setSchoolLogoFile] = useState<File | null>(null);
  const [schoolCalendarFile, setSchoolCalendarFile] = useState<File | null>(null);
  const [calendarSchoolIds, setCalendarSchoolIds] = useState<string[]>([]);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [classSchoolId, setClassSchoolId] = useState("");
  const [classPeriod, setClassPeriod] = useState("matutino");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classFilterSchoolId, setClassFilterSchoolId] = useState("");
  const [classFilterPeriod, setClassFilterPeriod] = useState("");
  const [classPage, setClassPage] = useState(1);
  const currentYear = new Date().getFullYear();
  const [classYear, setClassYear] = useState(currentYear);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [adminAllowedPeriods, setAdminAllowedPeriods] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMsg, setLoginMsg] = useState("");
  const [loginOk, setLoginOk] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Busca
  const [query, setQuery] = useState("");

  // Modal confirmação
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingTeacher, setPendingTeacher] = useState<Teacher | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState("");
  const [editBirthDay, setEditBirthDay] = useState<number | "">("");
  const [editBirthMonth, setEditBirthMonth] = useState<number | "">("");
  const [editSchoolIds, setEditSchoolIds] = useState<string[]>([]);
  const [editClassIds, setEditClassIds] = useState<string[]>([]);
  const [editClassPicker, setEditClassPicker] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("professor");
  const [editIsAdmin, setEditIsAdmin] = useState(false);
  const [editWasAdmin, setEditWasAdmin] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [mobileTeacherActions, setMobileTeacherActions] = useState<Teacher | null>(null);

  // Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastType, setToastType] = useState<ToastType>("ok");
  const [toastTitle, setToastTitle] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const toastTimer = useRef<number | null>(null);

  // Paginação
  const [pageSize] = useState(10);

  const [resetResult, setResetResult] = useState<{ username: string; password: string; name: string } | null>(null);
  const [createResult, setCreateResult] = useState<{
    username: string;
    password: string;
    name: string;
    role: UserRole;
  } | null>(null);
  const [resetLoadingId, setResetLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [userFilterSchoolId, setUserFilterSchoolId] = useState("");
  const [activeUserPage, setActiveUserPage] = useState(1);
  const [inactiveUserPage, setInactiveUserPage] = useState(1);
  const [itemPage, setItemPage] = useState(1);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileActiveLimit, setMobileActiveLimit] = useState(6);
  const [mobileInactiveLimit, setMobileInactiveLimit] = useState(6);
  const [mobileItemsLimit, setMobileItemsLimit] = useState(6);
  const [focusSchoolId, setFocusSchoolId] = useState("");
  const [syncingFocusSchool, setSyncingFocusSchool] = useState(false);

  const visiblePeriodOptions = useMemo(() => {
    if (isSuperAdmin || !adminAllowedPeriods.length) return [...PERIOD_OPTIONS];
    return PERIOD_OPTIONS.filter((p) => adminAllowedPeriods.includes(p));
  }, [isSuperAdmin, adminAllowedPeriods]);
  const schoolScopeLocked = false;
  const focusSchoolName = useMemo(
    () => schools.find((s) => s.id === focusSchoolId)?.name ?? "",
    [schools, focusSchoolId]
  );
  const createClassOptions = useMemo(() => {
    if (!schoolIds.length) return [];
    return bindingClasses
      .filter((c) => c.active && schoolIds.includes(c.school_id))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [bindingClasses, schoolIds]);
  const createAvailableClassOptions = useMemo(
    () => createClassOptions.filter((c) => !createClassIds.includes(c.id)),
    [createClassIds, createClassOptions]
  );
  const editClassOptions = useMemo(() => {
    if (!editSchoolIds.length) return [];
    return bindingClasses
      .filter((c) => c.active && editSchoolIds.includes(c.school_id))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [bindingClasses, editSchoolIds]);
  const editAvailableClassOptions = useMemo(
    () => editClassOptions.filter((c) => !editClassIds.includes(c.id)),
    [editClassIds, editClassOptions]
  );

  function ensureFocusSchoolSelected(actionLabel: string) {
    void actionLabel;
    return true;
  }

  function roleLabel(role?: string | null) {
    if (role === "diretor") return "Diretor(a)";
    if (role === "secretaria") return "Secretaria";
    if (role === "coordenador") return "Coordenador(a)";
    if (role === "estagiario") return "Estagiário(a)";
    return "Professor(a)";
  }

  function isManagementRole(role?: string | null) {
    return role === "diretor" || role === "secretaria" || role === "coordenador";
  }

  function classLabel(classId: string) {
    const row = bindingClasses.find((c) => c.id === classId);
    if (!row) return "Turma";
    const schoolName = schools.find((s) => s.id === row.school_id)?.name ?? "Escola";
    return `${row.name} • ${row.period} • ${schoolName}`;
  }


  const closeConfirm = useCallback(() => {
    setConfirmOpen(false);
    setPendingTeacher(null);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditTeacher(null);
    setEditName("");
    setEditBirthDay("");
    setEditBirthMonth("");
    setEditSchoolIds([]);
    setEditClassIds([]);
    setEditClassPicker("");
    setEditRole("professor");
    setEditIsAdmin(false);
    setEditWasAdmin(false);
  }, []);

  function showToast(type: ToastType, title: string, message: string) {
    setToastType(type);
    setToastTitle(title);
    setToastMsg(message);
    setToastOpen(true);

    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastOpen(false), 3200);
  }

  function closeToast() {
    setToastOpen(false);
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    toastTimer.current = null;
  }

  async function adminApi(path: string, body: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      throw new Error("Faça login para acessar.");
    }

    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(payload.error || "Erro ao processar.");
    return payload;
  }

  async function handleLogin() {
    setLoginMsg("");
    setLoginOk(false);
    setLoginLoading(true);
    const rawLogin = loginUser.trim();
    const email = rawLogin.includes("@")
      ? rawLogin.toLowerCase()
      : `${normalizeUsername(rawLogin)}@local.eeav`;
    if (!email || email.startsWith("@")) {
      setLoginMsg("Usuário inválido.");
      setLoginLoading(false);
      return;
    }
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password: loginPassword,
    });
    if (error) {
      setLoginMsg("Login inválido.");
      setLoginLoading(false);
      return;
    }

    const user = signInData?.session?.user ?? null;
    if (user?.user_metadata?.force_password_change) {
      setLoginLoading(false);
      setLoginOpen(false);
      window.location.href = "/auth/first-login";
      return;
    }

    setIsLoggedIn(!!user);
    if (rememberMe) {
      localStorage.removeItem("eeav_temp_session");
      sessionStorage.removeItem("eeav_temp_session");
    } else {
      localStorage.setItem("eeav_temp_session", "1");
      sessionStorage.setItem("eeav_temp_session", "1");
    }
    setLoginMsg("Login realizado!");
    setLoginOk(true);
    await syncAdmin(user);
    window.setTimeout(() => {
      setLoginLoading(false);
      setLoginOpen(false);
      setLoginPassword("");
      setLoginUser("");
      setLoginMsg("");
      setLoginOk(false);
    }, 400);
  }

  async function syncAdmin(user: AuthUserLike) {
    setIsLoggedIn(!!user);
    if (!user) {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminAllowedPeriods([]);
      return;
    }
    if (user?.user_metadata?.force_password_change) {
      window.location.href = "/auth/first-login";
      return;
    }
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token ?? "";
      if (!token) {
        setIsAdmin(false);
        return;
      }
      const res = await fetch("/api/admin/me", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      const ok = !!data?.isAdmin;
      setIsAdmin(ok);
      setIsSuperAdmin(!!data?.isSuperAdmin);
      setAdminAllowedPeriods(Array.isArray(data?.allowedPeriods) ? data.allowedPeriods.filter(Boolean) : []);
      const metaFocus = String(user?.user_metadata?.cadastros_focus_school_id ?? "").trim();
      if (!!data?.isSuperAdmin && metaFocus && !focusSchoolId) {
        setFocusSchoolId(metaFocus);
      }
      if (ok) void load();
    } catch {
      setIsAdmin(false);
      setIsSuperAdmin(false);
      setAdminAllowedPeriods([]);
    }
  }

  async function load() {
    setLoading(true);
    try {
      const data = await adminApi("/api/teachers/list", {});
      setTeachers((data.data ?? []) as Teacher[]);
    } catch (err: unknown) {
      showToast("err", "Falha ao carregar", errorMessage(err, "Erro desconhecido."));
    } finally {
      setLoading(false);
    }
  }

  async function loadSchools() {
    setSchoolsLoading(true);
    try {
      const data = await adminApi("/api/schools/list", {});
      setSchools((data.data ?? []) as School[]);
    } catch (err: unknown) {
      showToast("err", "Erro ao carregar escolas", errorMessage(err, "Erro desconhecido."));
    } finally {
      setSchoolsLoading(false);
    }
  }

  async function loadResourceGroups() {
    setResourceGroupsLoading(true);
    try {
      const data = await adminApi("/api/resource-groups/list", {});
      setResourceGroups((data.data ?? []) as ResourceGroup[]);
    } catch (err: unknown) {
      showToast("err", "Erro ao carregar grupos", errorMessage(err, "Erro desconhecido."));
    } finally {
      setResourceGroupsLoading(false);
    }
  }

  async function createResourceGroup() {
    if (!isAdmin || !isSuperAdmin) {
      showToast("err", "Sem permissão", "Apenas o admin geral pode criar grupo de recursos.");
      return;
    }
    if (!newResourceGroupName.trim()) {
      showToast("err", "Campo obrigatório", "Informe o nome do grupo de recursos.");
      return;
    }
    try {
      await adminApi("/api/resource-groups/create", { name: newResourceGroupName.trim() });
      setNewResourceGroupName("");
      showToast("ok", "Grupo criado", "Grupo de recursos cadastrado.");
      await loadResourceGroups();
    } catch (err: unknown) {
      showToast("err", "Erro ao criar grupo", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function linkSchoolToResourceGroup() {
    if (!isAdmin || !isSuperAdmin) {
      showToast("err", "Sem permissão", "Apenas o admin geral pode vincular escola ao grupo.");
      return;
    }
    if (!linkSchoolId) {
      showToast("err", "Campo obrigatório", "Selecione a escola.");
      return;
    }
    try {
      await adminApi("/api/resource-groups/link-school", {
        school_id: linkSchoolId,
        group_id: linkGroupId || null,
      });
      showToast("ok", "Vínculo atualizado", linkGroupId ? "Escola vinculada ao grupo." : "Vínculo removido.");
      await loadResourceGroups();
    } catch (err: unknown) {
      showToast("err", "Erro ao vincular", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function loadClasses() {
    setClassesLoading(true);
    try {
      const data = await adminApi("/api/classes/list", {
        year: classYear,
        school_id: classFilterSchoolId,
        period: classFilterPeriod,
      });
      setClasses((data.data ?? []) as ClassRow[]);
    } catch (err: unknown) {
      showToast("err", "Erro ao carregar turmas", errorMessage(err, "Erro desconhecido."));
    } finally {
      setClassesLoading(false);
    }
  }

  async function loadBindingClasses() {
    setBindingClassesLoading(true);
    try {
      const data = await adminApi("/api/classes/list", {
        year: classYear,
      });
      setBindingClasses((data.data ?? []) as ClassRow[]);
    } catch (err: unknown) {
      showToast("err", "Erro ao carregar turmas de vínculo", errorMessage(err, "Erro desconhecido."));
    } finally {
      setBindingClassesLoading(false);
    }
  }

  async function loadItems() {
    setItemsLoading(true);
    try {
      const data = await adminApi("/api/items/list", {
        school_id: itemFilterSchoolId,
      });
      setItems((data.data ?? []) as ItemRow[]);
    } catch (err: unknown) {
      showToast("err", "Erro ao carregar materiais", errorMessage(err, "Erro desconhecido."));
    } finally {
      setItemsLoading(false);
    }
  }

  async function saveSchool() {
    if (!isAdmin || !isSuperAdmin) {
      showToast("err", "Sem permissão", "Apenas o admin geral pode editar cadastro de escolas.");
      return;
    }
    if (!schoolName.trim()) {
      showToast("err", "Campo obrigatório", "Informe o nome da escola.");
      return;
    }
    if (!editingSchoolId) {
      showToast("err", "Selecione", "Escolha a escola para editar.");
      return;
    }
    try {
      await adminApi("/api/schools/update", {
        id: editingSchoolId,
        name: schoolName.trim(),
      });
      showToast("ok", "Atualizado", "Escola atualizada.");
      setSchoolName("");
      setEditingSchoolId(null);
      await loadSchools();
    } catch (err: unknown) {
      showToast("err", "Erro ao atualizar", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function createSchool() {
    if (!isAdmin || !isSuperAdmin) {
      showToast("err", "Sem permissão", "Apenas o admin geral pode cadastrar escolas.");
      return;
    }
    if (!newSchoolName.trim()) {
      showToast("err", "Campo obrigatório", "Informe o nome da nova escola.");
      return;
    }
    try {
      await adminApi("/api/schools/create", { name: newSchoolName.trim(), active: true });
      showToast("ok", "Cadastrado", "Escola cadastrada com sucesso.");
      setNewSchoolName("");
      await loadSchools();
    } catch (err: unknown) {
      showToast("err", "Erro ao cadastrar", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function uploadSchoolLogo() {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem enviar logos.");
      return;
    }
    if (!editingSchoolId) {
      showToast("err", "Selecione", "Escolha a escola para enviar a logo.");
      return;
    }
    if (!schoolLogoFile) {
      showToast("err", "Arquivo obrigatório", "Selecione uma imagem para a logo.");
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Faça login para continuar.");

      const form = new FormData();
      form.append("school_id", editingSchoolId);
      form.append("logo", schoolLogoFile);

      const res = await fetch("/api/schools/logo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Erro ao enviar logo.");

      setSchoolLogoFile(null);
      showToast("ok", "Logo atualizada", "A logo da escola foi salva.");
      await loadSchools();
    } catch (err: unknown) {
      showToast("err", "Erro ao enviar logo", errorMessage(err, "Erro desconhecido."));
    }
  }

  function toggleCalendarSchoolId(schoolId: string) {
    setCalendarSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((id) => id !== schoolId) : [...prev, schoolId]
    );
  }

  async function uploadSchoolCalendar() {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem enviar calendário.");
      return;
    }
    if (!schoolCalendarFile) {
      showToast("err", "Arquivo obrigatório", "Selecione um PDF de calendário.");
      return;
    }
    if (!calendarSchoolIds.length) {
      showToast("err", "Escolas obrigatórias", "Selecione ao menos uma escola para receber o calendário.");
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Faça login para continuar.");

      const form = new FormData();
      form.append("calendar", schoolCalendarFile);
      form.append("school_ids", JSON.stringify(calendarSchoolIds));

      const res = await fetch("/api/schools/calendar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || "Erro ao enviar calendário.");

      setSchoolCalendarFile(null);
      showToast(
        "ok",
        "Calendário enviado",
        calendarSchoolIds.length > 1
          ? "PDF aplicado para as escolas selecionadas."
          : "PDF aplicado para a escola selecionada."
      );
      await loadSchools();
    } catch (err: unknown) {
      showToast("err", "Erro ao enviar calendário", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function saveClass() {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem cadastrar turmas.");
      return;
    }
    if (!ensureFocusSchoolSelected("cadastrar/editar turma")) return;
    if (!className.trim() || !classSchoolId || !classPeriod) {
      showToast("err", "Campos obrigatórios", "Informe turma, escola e período.");
      return;
    }
    try {
      if (editingClassId) {
        await adminApi("/api/classes/update", {
          id: editingClassId,
          name: className.trim(),
          school_id: classSchoolId,
          period: classPeriod,
        });
        showToast("ok", "Atualizado", "Turma atualizada.");
      } else {
        await adminApi("/api/classes/create", {
          name: className.trim(),
          school_id: classSchoolId,
          period: classPeriod,
        });
        showToast("ok", "Cadastrado", "Turma cadastrada.");
      }
      setClassName("");
      setClassSchoolId("");
      setClassPeriod("matutino");
      setEditingClassId(null);
      await loadClasses();
    } catch (err: unknown) {
      showToast("err", "Erro ao salvar", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function saveItem() {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem cadastrar materiais.");
      return;
    }
    if (!ensureFocusSchoolSelected("cadastrar/editar material")) return;
    if (!itemName.trim() || !itemCategory.trim() || !itemQty || itemQty < 1 || !itemSchoolId) {
      showToast("err", "Campos obrigatórios", "Informe escola, categoria, material e quantidade.");
      return;
    }
    try {
      setItemSaving(true);
      if (editingItemId) {
        await adminApi("/api/items/update", {
          id: editingItemId,
          name: itemName.trim(),
          category: itemCategory.trim(),
          total_qty: Number(itemQty),
          school_id: itemSchoolId,
        });
        showToast("ok", "Atualizado", "Material atualizado.");
      } else {
        await adminApi("/api/items/create", {
          name: itemName.trim(),
          category: itemCategory.trim(),
          total_qty: Number(itemQty),
          school_id: itemSchoolId,
        });
        showToast("ok", "Cadastrado", "Material cadastrado.");
      }
      setItemName("");
      setItemCategory("");
      setItemQty(1);
      setItemSchoolId("");
      setEditingItemId(null);
      await loadItems();
    } catch (err: unknown) {
      showToast("err", "Erro ao salvar", errorMessage(err, "Erro desconhecido."));
    } finally {
      setItemSaving(false);
    }
  }

  async function deleteItem(id: string) {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem excluir materiais.");
      return;
    }
    if (!ensureFocusSchoolSelected("excluir material")) return;
    const target = items.find((it) => it.id === id) ?? null;
    if (!target) return;
    setPendingItem(target);
    setItemConfirmOpen(true);
  }

  async function confirmDeleteItem() {
    if (!pendingItem) return;
    try {
      setItemDeletingId(pendingItem.id);
      await adminApi("/api/items/delete", { id: pendingItem.id });
      showToast("ok", "Excluído", "Material removido.");
      await loadItems();
    } catch (err: unknown) {
      showToast("err", "Erro ao excluir", errorMessage(err, "Erro desconhecido."));
    } finally {
      setItemConfirmOpen(false);
      setPendingItem(null);
      setItemDeletingId(null);
    }
  }

  async function deleteClass(id: string) {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem excluir turmas.");
      return;
    }
    if (!ensureFocusSchoolSelected("excluir turma")) return;
    const ok = window.confirm("Excluir esta turma?");
    if (!ok) return;
    try {
      await adminApi("/api/classes/delete", { id });
      showToast("ok", "Excluída", "Turma removida.");
      await loadClasses();
    } catch (err: unknown) {
      showToast("err", "Erro ao excluir", errorMessage(err, "Erro desconhecido."));
    }
  }

  async function cloneClassesFromYear() {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem iniciar novo ano.");
      return;
    }
    const ok = window.confirm(`Copiar turmas do ano ${classYear} para o ano atual?`);
    if (!ok) return;
    try {
      const data = await adminApi("/api/classes/clone-year", { from_year: classYear });
      showToast("ok", "Novo ano", `Turmas copiadas: ${data.created ?? 0}.`);
      await loadClasses();
    } catch (err: unknown) {
      showToast("err", "Erro", errorMessage(err, "Erro desconhecido."));
    }
  }

  useEffect(() => {
    (async () => {
      const tempSession = localStorage.getItem("eeav_temp_session");
      if (tempSession && !sessionStorage.getItem("eeav_temp_session")) {
        await supabase.auth.signOut({ scope: "local" });
        localStorage.removeItem("eeav_temp_session");
      }
      const { data: session } = await supabase.auth.getSession();
      const user = session.session?.user ?? null;
      await syncAdmin(user);
    })();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void syncAdmin(session?.user ?? null);
      }
    );
    return () => {
      authListener.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fromQuery = Number(searchParams.get("year") ?? "");
    const fromStorage = Number(
      typeof window !== "undefined" ? localStorage.getItem("eeav_year") ?? "" : ""
    );
    const current = new Date().getFullYear();
    const picked =
      Number.isFinite(fromQuery) && fromQuery >= 2026
        ? Math.min(fromQuery, current)
        : Number.isFinite(fromStorage) && fromStorage >= 2026
        ? Math.min(fromStorage, current)
        : 2026;
    setClassYear(picked);
  }, [searchParams]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("eeav_year", String(classYear));
  }, [classYear]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "users") {
      void loadSchools();
    }
    if (tab === "schools") {
      void loadSchools();
      void loadResourceGroups();
    }
    if (tab === "classes") {
      void loadSchools();
      void loadClasses();
    }
    if (tab === "items") {
      void loadSchools();
      void loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "items") {
      void loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemFilterSchoolId, tab, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "classes") {
      void loadClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classYear, classFilterSchoolId, classFilterPeriod, tab, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadBindingClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classYear, isAdmin]);

  useEffect(() => {
    if (tab !== "classes") return;
    setClassPage(1);
  }, [classYear, classFilterSchoolId, classFilterPeriod, tab]);

  const counts = useMemo(() => {
    const total = teachers.length;
    const active = teachers.filter((t) => t.active).length;
    const inactive = total - active;
    return { total, active, inactive };
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = teachers
      .filter((t) => {
        const schoolsOfTeacher = (t.school_ids ?? []).filter(Boolean) as string[];
        const schoolOk = !userFilterSchoolId || schoolsOfTeacher.includes(userFilterSchoolId);
        if (!schoolOk) return false;
        if (!q) return true;
        const nameOk = t.name?.toLowerCase().includes(q);
        const emailOk = (t.email ?? "").toLowerCase().includes(q);
        return nameOk || emailOk;
      })
      .sort((a, b) => {
        const ad = new Date(a.created_at).getTime();
        const bd = new Date(b.created_at).getTime();
        return bd - ad;
      });

    return list;
  }, [teachers, query, userFilterSchoolId]);

  const todayParts = useMemo(() => {
    const now = new Date();
    return { day: now.getDate(), month: now.getMonth() + 1 };
  }, []);

  const yearOptions = useMemo(() => {
    const start = 2026;
    const end = Math.max(currentYear, start);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentYear]);

  function isBirthdayToday(t: Teacher) {
    if (!t.birth_day || !t.birth_month) return false;
    return t.birth_day === todayParts.day && t.birth_month === todayParts.month;
  }

  const activeTeachers = useMemo(
    () => filteredTeachers.filter((t) => t.active),
    [filteredTeachers]
  );

  const inactiveTeachers = useMemo(
    () => filteredTeachers.filter((t) => !t.active),
    [filteredTeachers]
  );

  const activeUserTotalPages = useMemo(
    () => Math.max(1, Math.ceil(activeTeachers.length / pageSize)),
    [activeTeachers.length, pageSize]
  );
  const inactiveUserTotalPages = useMemo(
    () => Math.max(1, Math.ceil(inactiveTeachers.length / pageSize)),
    [inactiveTeachers.length, pageSize]
  );
  const pagedTeachers = useMemo(() => {
    const safePage = Math.min(activeUserPage, activeUserTotalPages);
    const start = (safePage - 1) * pageSize;
    return activeTeachers.slice(start, start + pageSize);
  }, [activeTeachers, activeUserPage, activeUserTotalPages, pageSize]);
  const activeTeachersVisible = useMemo(
    () => (isMobileViewport ? pagedTeachers.slice(0, mobileActiveLimit) : pagedTeachers),
    [isMobileViewport, mobileActiveLimit, pagedTeachers]
  );
  const pagedInactiveTeachers = useMemo(() => {
    const safePage = Math.min(inactiveUserPage, inactiveUserTotalPages);
    const start = (safePage - 1) * pageSize;
    return inactiveTeachers.slice(start, start + pageSize);
  }, [inactiveTeachers, inactiveUserPage, inactiveUserTotalPages, pageSize]);
  const inactiveTeachersVisible = useMemo(
    () => (isMobileViewport ? pagedInactiveTeachers.slice(0, mobileInactiveLimit) : pagedInactiveTeachers),
    [isMobileViewport, mobileInactiveLimit, pagedInactiveTeachers]
  );

  useEffect(() => {
    setActiveUserPage(1);
    setInactiveUserPage(1);
  }, [query, userFilterSchoolId]);

  useEffect(() => {
    if (activeUserPage > activeUserTotalPages) setActiveUserPage(activeUserTotalPages);
  }, [activeUserPage, activeUserTotalPages]);

  useEffect(() => {
    if (inactiveUserPage > inactiveUserTotalPages) setInactiveUserPage(inactiveUserTotalPages);
  }, [inactiveUserPage, inactiveUserTotalPages]);

  const filteredItems = useMemo(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      return (
        it.name.toLowerCase().includes(q) ||
        it.category.toLowerCase().includes(q) ||
        (schools.find((s) => s.id === it.school_id)?.name ?? "").toLowerCase().includes(q)
      );
    });
  }, [items, itemSearch, schools]);

  const itemTotalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / pageSize)),
    [filteredItems.length, pageSize]
  );
  const pagedItems = useMemo(() => {
    const safePage = Math.min(itemPage, itemTotalPages);
    const start = (safePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, itemPage, itemTotalPages, pageSize]);
  const itemsVisible = useMemo(
    () => (isMobileViewport ? pagedItems.slice(0, mobileItemsLimit) : pagedItems),
    [isMobileViewport, mobileItemsLimit, pagedItems]
  );

  useEffect(() => {
    setItemPage(1);
  }, [itemFilterSchoolId, itemSearch]);

  useEffect(() => {
    if (itemPage > itemTotalPages) setItemPage(itemTotalPages);
  }, [itemPage, itemTotalPages]);

  useEffect(() => {
    const syncViewport = () => setIsMobileViewport(window.innerWidth <= 640);
    syncViewport();
    try {
      const savedActive = Number(localStorage.getItem("mutare_mobile_active_limit") ?? "");
      const savedInactive = Number(localStorage.getItem("mutare_mobile_inactive_limit") ?? "");
      const savedItems = Number(localStorage.getItem("mutare_mobile_items_limit") ?? "");
      if (Number.isFinite(savedActive) && savedActive >= 6) setMobileActiveLimit(savedActive);
      if (Number.isFinite(savedInactive) && savedInactive >= 6) setMobileInactiveLimit(savedInactive);
      if (Number.isFinite(savedItems) && savedItems >= 6) setMobileItemsLimit(savedItems);
    } catch {
      // ignore storage errors
    }
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("mutare_mobile_active_limit", String(mobileActiveLimit));
    localStorage.setItem("mutare_mobile_inactive_limit", String(mobileInactiveLimit));
    localStorage.setItem("mutare_mobile_items_limit", String(mobileItemsLimit));
  }, [mobileActiveLimit, mobileInactiveLimit, mobileItemsLimit]);

  useEffect(() => {
    setMobileActiveLimit(6);
  }, [activeUserPage, query, userFilterSchoolId]);

  useEffect(() => {
    setMobileInactiveLimit(6);
  }, [inactiveUserPage, query, userFilterSchoolId]);

  useEffect(() => {
    setMobileItemsLimit(6);
  }, [itemPage, itemSearch, itemFilterSchoolId]);

  const sortedClasses = useMemo(
    () => [...classes].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [classes]
  );
  const classPageSize = 10;
  const classTotalPages = useMemo(
    () => Math.max(1, Math.ceil(sortedClasses.length / classPageSize)),
    [sortedClasses.length]
  );
  const visibleClasses = useMemo(() => {
    const safePage = Math.min(classPage, classTotalPages);
    const start = (safePage - 1) * classPageSize;
    return sortedClasses.slice(start, start + classPageSize);
  }, [sortedClasses, classPage, classTotalPages]);

  useEffect(() => {
    if (classPage > classTotalPages) setClassPage(classTotalPages);
  }, [classPage, classTotalPages]);

  useEffect(() => {
    if (!schools.length) {
      setFocusSchoolId("");
      return;
    }
    const allowedIds = new Set(schools.map((s) => s.id));
    if (focusSchoolId && allowedIds.has(focusSchoolId)) return;
    if (isSuperAdmin && !focusSchoolId) return;

    if (typeof window !== "undefined") {
      const saved =
        localStorage.getItem("mutare_cadastros_focus_school") ??
        localStorage.getItem("mutare_selected_school_id") ??
        "";
      if (saved && allowedIds.has(saved)) {
        setFocusSchoolId(saved);
        return;
      }
    }
    if (isSuperAdmin) {
      setFocusSchoolId("");
      return;
    }
    setFocusSchoolId(schools[0].id);
  }, [schools, focusSchoolId, isSuperAdmin]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (focusSchoolId) {
      localStorage.setItem("mutare_cadastros_focus_school", focusSchoolId);
      localStorage.setItem("mutare_selected_school_id", focusSchoolId);
    } else {
      localStorage.removeItem("mutare_cadastros_focus_school");
    }
  }, [focusSchoolId]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    let cancelled = false;
    const run = async () => {
      try {
        setSyncingFocusSchool(true);
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;
        const currentMeta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const currentValue = String(currentMeta.cadastros_focus_school_id ?? "").trim();
        if (currentValue === focusSchoolId) return;
        await supabase.auth.updateUser({
          data: {
            ...currentMeta,
            cadastros_focus_school_id: focusSchoolId || "",
          },
        });
      } finally {
        if (!cancelled) setSyncingFocusSchool(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [focusSchoolId, isSuperAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const targetSchoolId = focusSchoolId || "";
    setUserFilterSchoolId(targetSchoolId);
    setItemFilterSchoolId(targetSchoolId);
    setClassFilterSchoolId(targetSchoolId);
    if (!itemSchoolId && targetSchoolId) setItemSchoolId(targetSchoolId);
    if (!classSchoolId && targetSchoolId) setClassSchoolId(targetSchoolId);
  }, [focusSchoolId, isAdmin, itemSchoolId, classSchoolId]);

  const schoolNameById = useMemo(() => {
    const map = new Map<string, string>();
    schools.forEach((s) => map.set(s.id, s.name));
    return map;
  }, [schools]);
  const createAdminLocationOptions = useMemo(
    () =>
      schoolIds
        .map((id) => schoolNameById.get(id) ?? "")
        .map((name) => name.trim())
        .filter(Boolean),
    [schoolIds, schoolNameById]
  );

  function formatTeacherSchools(ids?: string[] | null) {
    if (!ids?.length) return "—";
    const labels = ids.map((id) => schoolNameById.get(id)).filter(Boolean);
    return labels.length ? labels.join(", ") : "—";
  }
  function formatTeacherClasses(ids?: string[] | null) {
    if (!ids?.length) return "—";
    const labels = ids
      .map((id) => bindingClasses.find((c) => c.id === id))
      .filter(Boolean)
      .map((c) => `${c?.name} (${c?.period})`);
    return labels.length ? labels.join(", ") : "—";
  }

  useEffect(() => {
    if (!createAsAdmin) return;
    setCreateAdminLocations((prev) => {
      const filtered = prev.filter((location) => createAdminLocationOptions.includes(location));
      if (filtered.length) return filtered;
      return createAdminLocationOptions.length ? [createAdminLocationOptions[0]] : [];
    });
  }, [createAsAdmin, createAdminLocationOptions]);

  useEffect(() => {
    if (!createAsAdmin) return;
    if (createAdminLocations.includes(createAdminDefaultLocation)) return;
    setCreateAdminDefaultLocation(createAdminLocations[0] ?? "");
  }, [createAsAdmin, createAdminDefaultLocation, createAdminLocations]);

  useEffect(() => {
    const shouldBeManagement = isManagementRole(createRole);
    if (shouldBeManagement !== createAsAdmin) {
      setCreateAsAdmin(shouldBeManagement);
    }
  }, [createRole, createAsAdmin]);

  useEffect(() => {
    const shouldBeManagement = isManagementRole(editRole);
    if (shouldBeManagement !== editIsAdmin) {
      setEditIsAdmin(shouldBeManagement);
    }
  }, [editRole, editIsAdmin]);

  useEffect(() => {
    if (!editingSchoolId) return;
    setCalendarSchoolIds((prev) => (prev.length ? prev : [editingSchoolId]));
  }, [editingSchoolId]);

  useEffect(() => {
    if (!visiblePeriodOptions.length) return;
    if (!visiblePeriodOptions.includes(classPeriod as (typeof PERIOD_OPTIONS)[number])) {
      setClassPeriod(visiblePeriodOptions[0]);
    }
    if (classFilterPeriod && !visiblePeriodOptions.includes(classFilterPeriod as (typeof PERIOD_OPTIONS)[number])) {
      setClassFilterPeriod("");
    }
    setCreateAdminPeriods((prev) => {
      const filtered = prev.filter((period) => visiblePeriodOptions.includes(period as (typeof PERIOD_OPTIONS)[number]));
      return filtered.length ? filtered : [visiblePeriodOptions[0]];
    });
  }, [classFilterPeriod, classPeriod, visiblePeriodOptions]);

  useEffect(() => {
    const allowed = new Set(createClassOptions.map((c) => c.id));
    setCreateClassIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [createClassOptions]);

  useEffect(() => {
    const allowed = new Set(editClassOptions.map((c) => c.id));
    setEditClassIds((prev) => prev.filter((id) => allowed.has(id)));
  }, [editClassOptions]);

  useEffect(() => {
    const allowed = new Set(createAvailableClassOptions.map((c) => c.id));
    if (!allowed.has(createClassPicker)) setCreateClassPicker("");
  }, [createAvailableClassOptions, createClassPicker]);

  useEffect(() => {
    const allowed = new Set(editAvailableClassOptions.map((c) => c.id));
    if (!allowed.has(editClassPicker)) setEditClassPicker("");
  }, [editAvailableClassOptions, editClassPicker]);

  useEffect(() => {
    if (!confirmOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeConfirm();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [confirmOpen, closeConfirm]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      const openMenus = document.querySelectorAll<HTMLDetailsElement>(`details.${styles.tableActionsMenu}[open]`);
      openMenus.forEach((menu) => {
        if (!target || !menu.contains(target)) menu.removeAttribute("open");
      });
    };
    document.addEventListener("click", onDocumentClick);
    return () => {
      document.removeEventListener("click", onDocumentClick);
    };
  }, []);

  useEffect(() => {
    if (!mobileTeacherActions) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileTeacherActions(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileTeacherActions]);

  async function addTeacher() {
    setCreateResult(null);
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem cadastrar professores.");
      return;
    }
    if (!ensureFocusSchoolSelected("cadastrar professor")) return;
    if (!name.trim()) {
      showToast("err", "Campo obrigatório", "Informe o nome do professor.");
      return;
    }
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername || normalizedUsername.length < 3) {
      showToast("err", "Usuário inválido", "Use o padrão nome.ultimo.");
      return;
    }
    if (!schoolIds.length) {
      showToast("err", "Campo obrigatório", "Selecione ao menos uma escola.");
      return;
    }
    const requiresClassBinding = createRole === "professor" || createRole === "estagiario";
    if (requiresClassBinding && !createClassIds.length) {
      showToast("err", "Campo obrigatório", "Selecione ao menos uma turma para o professor.");
      return;
    }
    if (createAsAdmin && !createAdminLocations.length) {
      showToast("err", "Gestão sem escola", "Selecione ao menos uma escola para o perfil de gestão.");
      return;
    }

    try {
      const teacherResult = await adminApi("/api/teachers/create", {
        name: name.trim(),
        email: normalizedUsername,
        birth_day: birthDay || null,
        birth_month: birthMonth || null,
        school_ids: schoolIds,
        class_ids: createClassIds,
      });
      const teacherId = String(teacherResult?.id ?? "");
      if (teacherId) {
        try {
          const userResult = await adminApi("/api/users/create", {
            username: normalizedUsername,
            name: name.trim(),
            teacher_id: teacherId,
            management_role: createRole,
          });
          const createdUserId = String(userResult?.user_id ?? "").trim();
          if (createAsAdmin && createdUserId) {
            await adminApi("/api/admin/users", {
              user_id: createdUserId,
              management_role: createRole,
              allowed_periods: createAdminPeriods,
              allowed_locations: createAdminLocations,
              default_period: createAdminDefaultPeriod,
              default_location: createAdminDefaultLocation,
            });
          }
          setCreateResult({
            username: userResult.username,
            password: userResult.password,
            name: name.trim(),
            role: createRole,
          });
        } catch (err: unknown) {
          showToast("err", "Acesso não criado", errorMessage(err, "Professor criado, mas o acesso falhou."));
        }
      }

      setName("");
      setUsername("");
      setCreateRole("professor");
      setBirthDay("");
      setBirthMonth("");
      setSchoolIds([]);
      setCreateClassIds([]);
      setCreateClassPicker("");
      setCreateAsAdmin(false);
      setCreateAdminPeriods(["matutino"]);
      setCreateAdminLocations([]);
      setCreateAdminDefaultPeriod("matutino");
      setCreateAdminDefaultLocation("");
      showToast("ok", "Cadastrado", "Professor cadastrado com sucesso.");
      await load();
    } catch (err: unknown) {
      showToast("err", "Erro ao cadastrar", errorMessage(err, "Erro desconhecido."));
    }
  }

  function toggleCreateAdminPeriod(period: string) {
    setCreateAdminPeriods((prev) => {
      const next = prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period];
      if (!next.length) return prev;
      if (!next.includes(createAdminDefaultPeriod)) {
        setCreateAdminDefaultPeriod(next[0]);
      }
      return next;
    });
  }

  function toggleCreateAdminLocation(location: string) {
    setCreateAdminLocations((prev) => {
      const next = prev.includes(location) ? prev.filter((p) => p !== location) : [...prev, location];
      if (!next.length) return prev;
      if (!next.includes(createAdminDefaultLocation)) {
        setCreateAdminDefaultLocation(next[0]);
      }
      return next;
    });
  }

  function askToggle(t: Teacher) {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem ativar/desativar professores.");
      return;
    }
    if (!ensureFocusSchoolSelected("alterar status de usuário")) return;
    setPendingTeacher(t);
    setConfirmOpen(true);
  }

  async function confirmToggle() {
    const t = pendingTeacher;
    if (!t) return;

    try {
      await adminApi("/api/teachers/toggle", {
        id: t.id,
        active: !t.active,
      });

      setConfirmOpen(false);
      setPendingTeacher(null);

      showToast("ok", "Atualizado", t.active ? "Professor desativado." : "Professor ativado.");
      await load();
    } catch (err: unknown) {
      showToast("err", "Erro", errorMessage(err, "Erro desconhecido."));
    }
  }

  function openEdit(t: Teacher) {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem editar.");
      return;
    }
    if (!ensureFocusSchoolSelected("editar usuário")) return;
    setEditTeacher(t);
    setEditName(t.name ?? "");
    setEditBirthDay(t.birth_day ?? "");
    setEditBirthMonth(t.birth_month ?? "");
    setEditSchoolIds((t.school_ids ?? []).filter(Boolean) as string[]);
    setEditClassIds((t.class_ids ?? []).filter(Boolean) as string[]);
    setEditClassPicker("");
    const isManagementAdmin = t.profile_type === "admin_gestao";
    const detectedRole: UserRole =
      t.management_role === "diretor" ||
      t.management_role === "secretaria" ||
      t.management_role === "coordenador" ||
      t.management_role === "estagiario"
        ? t.management_role
        : isManagementAdmin
        ? "diretor"
        : "professor";
    setEditRole(detectedRole);
    setEditIsAdmin(isManagementAdmin);
    setEditWasAdmin(isManagementAdmin);
    setEditOpen(true);
  }

  async function confirmEdit() {
    const t = editTeacher;
    if (!t) return;
    if (!ensureFocusSchoolSelected("editar usuário")) return;
    if (!editName.trim()) {
      showToast("err", "Campo obrigatório", "Informe o nome do professor.");
      return;
    }
    if (!editSchoolIds.length) {
      showToast("err", "Campo obrigatório", "Selecione ao menos uma escola.");
      return;
    }
    const requiresClassBinding = editRole === "professor" || editRole === "estagiario";
    if (requiresClassBinding && !editClassIds.length) {
      showToast("err", "Campo obrigatório", "Selecione ao menos uma turma para o professor.");
      return;
    }

    setEditLoading(true);
    try {
      await adminApi("/api/teachers/update", {
        id: t.id,
        name: editName.trim(),
        birth_day: editBirthDay || null,
        birth_month: editBirthMonth || null,
        school_ids: editSchoolIds,
        class_ids: editClassIds,
      });

      if (isSuperAdmin) {
        const schoolLocations = editSchoolIds
          .map((id) => schoolNameById.get(id) ?? "")
          .map((s) => s.trim())
          .filter(Boolean);
        const allowedPeriods = visiblePeriodOptions.length ? visiblePeriodOptions : ["matutino"];
        if (editIsAdmin && !editWasAdmin) {
          await adminApi("/api/admin/users", {
            teacher_id: t.id,
            management_role: editRole,
            allowed_periods: allowedPeriods,
            allowed_locations: schoolLocations.length
              ? schoolLocations
              : schools.map((s) => s.name).filter(Boolean),
            default_period: allowedPeriods[0] ?? "matutino",
            default_location: schoolLocations[0] ?? schools[0]?.name ?? "",
          });
        } else if (editIsAdmin && editWasAdmin) {
          await adminApi("/api/admin/users", {
            teacher_id: t.id,
            management_role: editRole,
            allowed_periods: allowedPeriods,
            allowed_locations: schoolLocations.length
              ? schoolLocations
              : schools.map((s) => s.name).filter(Boolean),
            default_period: allowedPeriods[0] ?? "matutino",
            default_location: schoolLocations[0] ?? schools[0]?.name ?? "",
          });
        } else if (!editIsAdmin && editWasAdmin) {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData.session?.access_token;
          if (!token) throw new Error("Faça login novamente para atualizar o perfil.");
          const resp = await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ teacher_id: t.id }),
          });
          if (!resp.ok) {
            const payload = await resp.json().catch(() => ({}));
            throw new Error(String(payload?.error ?? "Falha ao remover perfil de admin."));
          }
        }
      }

      showToast("ok", "Atualizado", "Professor atualizado com sucesso.");
      closeEdit();
      await load();
    } catch (err: unknown) {
      showToast("err", "Erro ao atualizar", errorMessage(err, "Erro desconhecido."));
    } finally {
      setEditLoading(false);
    }
  }

  async function resetUserAccess(t: Teacher) {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem redefinir senha.");
      return;
    }
    if (!ensureFocusSchoolSelected("redefinir senha")) return;
    const ok = window.confirm(`Redefinir a senha de ${t.name}?`);
    if (!ok) return;
    setResetLoadingId(t.id);
    try {
      const data = await adminApi("/api/users/reset", {
        teacher_id: t.id,
        name: t.name,
      });
      setResetResult({ username: data.username, password: data.password, name: t.name });
      showToast("ok", "Senha redefinida", "Entregue a nova senha ao usuário.");
    } catch (err: unknown) {
      showToast("err", "Erro ao redefinir", errorMessage(err, "Erro desconhecido."));
    } finally {
      setResetLoadingId(null);
    }
  }

  async function deleteUserAccess(t: Teacher) {
    if (!isAdmin) {
      showToast("err", "Sem permissão", "Apenas administradores podem apagar usuários.");
      return;
    }
    if (!ensureFocusSchoolSelected("apagar usuário")) return;
    const ok = window.confirm(`Apagar o usuário de ${t.name}? Esta ação não pode ser desfeita.`);
    if (!ok) return;
    setDeleteLoadingId(t.id);
    try {
      await adminApi("/api/users/delete", { teacher_id: t.id });
      showToast("ok", "Usuário apagado", "Acesso removido com sucesso.");
      await load();
    } catch (err: unknown) {
      showToast("err", "Erro ao apagar", errorMessage(err, "Erro desconhecido."));
    } finally {
      setDeleteLoadingId(null);
    }
  }


  const TableSkeleton = () => (
    <>
      {Array.from({ length: Math.min(4, pageSize) }).map((_, idx) => (
        <tr key={`sk-${idx}`}>
          <td>
            <div className={styles.skelRow}>
              <div className={styles.skelAva} />
              <div style={{ flex: 1 }}>
                <div className={styles.skel} style={{ width: "45%", marginBottom: 8 }} />
                <div className={styles.skel} style={{ width: "25%" }} />
              </div>
            </div>
          </td>
          <td><div className={styles.skel} style={{ width: "55%" }} /></td>
          <td><div className={styles.skel} style={{ width: "65%" }} /></td>
          <td style={{ textAlign: "center" }}><div className={styles.skel} style={{ width: 90, margin: "0 auto" }} /></td>
          <td style={{ textAlign: "center" }}><div className={styles.skel} style={{ width: 110, margin: "0 auto" }} /></td>
        </tr>
      ))}
    </>
  );

  return (
    <main className={styles.wrap}>
      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroTitle}>
            <Link href="/portal" className={styles.icon} title="Voltar para o Portal">
              <SchoolLogo size={30} />
            </Link>

            <div>
              <h1 className={styles.h1}>Cadastros</h1>
              <p className={styles.p}>Usuários, turmas e escolas do sistema.</p>
            </div>
          </div>

          <div className={styles.actions}>
            {isAdmin ? (
              <span className={styles.pill}>Admin</span>
            ) : isLoggedIn ? (
              <span className={`${styles.pill} ${styles.pillMuted}`}>Sem permissão</span>
            ) : (
              <button
                type="button"
                className={`${styles.pill} ${styles.pillMuted} ${styles.pillButton}`}
                onClick={() => {
                  setLoginMsg("");
                  setLoginOpen(true);
                }}
              >
                Faça login
              </button>
            )}
          </div>
        </div>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className={`${styles.dot} ${styles.dotBlue}`} />
            <div>
              <div className={styles.kpiLabel}>Total</div>
              <div className={styles.kpiValue}>{counts.total}</div>
            </div>
          </div>

          <div className={styles.kpi}>
            <span className={`${styles.dot} ${styles.dotGreen}`} />
            <div>
              <div className={styles.kpiLabel}>Ativos</div>
              <div className={styles.kpiValue}>{counts.active}</div>
            </div>
          </div>

          <div className={styles.kpi}>
            <span className={`${styles.dot} ${styles.dotGray}`} />
            <div>
              <div className={styles.kpiLabel}>Inativos</div>
              <div className={styles.kpiValue}>{counts.inactive}</div>
            </div>
          </div>

          {loading && <span className={styles.pill}>Carregando…</span>}
        </div>

        {!isLoggedIn && (
          <div className={styles.card} style={{ marginTop: 12 }}>
            <div className={styles.cardTitle}>Login necessário</div>
            <div className={styles.cardSub}>
              Faça login no portal para acessar a área de professores.
            </div>
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={() => {
                  setLoginMsg("");
                  setLoginOpen(true);
                }}
              >
                Ir para o Portal
              </button>
            </div>
          </div>
        )}
      </section>

      <div className={styles.tabsRow} role="tablist" aria-label="Cadastros">
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "users" ? styles.tabActive : ""}`}
          onClick={() => setTab("users")}
        >
          Usuários
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "items" ? styles.tabActive : ""}`}
          onClick={() => setTab("items")}
        >
          Materiais
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "classes" ? styles.tabActive : ""}`}
          onClick={() => setTab("classes")}
        >
          Turmas
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${tab === "schools" ? styles.tabActive : ""}`}
          onClick={() => setTab("schools")}
        >
          Escolas
        </button>
      </div>

      {isSuperAdmin ? (
        <section className={styles.card} style={{ marginTop: 12 }}>
          <div className={styles.cardTop}>
            <div>
              <div className={styles.cardTitle}>Selecionar escola para visualizar registros</div>
              <div className={styles.cardSub}>
                Escolha uma escola para ver usuários, materiais e turmas somente dessa unidade.
              </div>
            </div>
          </div>
          <div className={styles.searchRow}>
            <select
              className={`${styles.input} ${styles.search}`}
              value={focusSchoolId}
              onChange={(e) => setFocusSchoolId(e.target.value)}
              title="Selecionar escola"
            >
              {isSuperAdmin ? <option value="">Todas as escolas</option> : null}
              {schools.map((s) => (
                <option key={`focus-school-${s.id}`} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {focusSchoolId ? (
              <span className={styles.pill}>Registros da escola selecionada</span>
            ) : (
              <span className={`${styles.pill} ${styles.pillMuted}`}>Visualizando todas as escolas</span>
            )}
            {syncingFocusSchool ? <span className={styles.pill}>Salvando preferência...</span> : null}
          </div>
          <div className={styles.cardSub} style={{ marginTop: 8 }}>
            Escola atual: <b>{focusSchoolName || "Todas as escolas"}</b>
          </div>
          {!focusSchoolId ? (
            <div className={styles.cardSub} style={{ marginTop: 4 }}>
              Mostrando registros de todas as escolas.
            </div>
          ) : null}
          {schoolScopeLocked ? (
            <div className={styles.alertError} style={{ marginTop: 8 }}>
              Selecione 1 escola para liberar cadastros e edições.
            </div>
          ) : null}
        </section>
      ) : null}

      {loginOpen ? (
        <div
          onClick={() => setLoginOpen(false)}
          className={styles.modalOverlay}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.55)",
            width: "100vw",
            height: "100vh",
            maxWidth: "none",
            margin: 0,
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.modalCard}
            style={{
              width: "100%",
              maxWidth: 420,
              background:
                "linear-gradient(180deg, rgba(52,211,153,0.35), rgba(56,189,248,0.25))",
              borderRadius: 16,
              border: "1px solid rgba(2,6,23,.12)",
              padding: 16,
              boxShadow: "0 18px 44px rgba(2,6,23,.22)",
              display: "grid",
              gap: 12,
            }}
          >
            <div
              className={styles.cardTitle}
              style={{ textAlign: "center", color: "#0f172a", textShadow: "0 0 16px rgba(56,189,248,0.5)" }}
            >
              Login
            </div>
            <div>
              <label
                className={styles.cardSub}
                style={{ display: "block", textAlign: "center", color: "#0f172a" }}
              >
                Usuário
              </label>
              <input
                className={styles.input}
                placeholder="nome.ultimo"
                value={loginUser}
                onChange={(e) => setLoginUser(e.target.value)}
              />
            </div>
            <div>
              <label
                className={styles.cardSub}
                style={{ display: "block", textAlign: "center", color: "#0f172a" }}
              >
                Senha
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className={styles.input}
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  style={{
                    position: "absolute",
                    right: 10,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "#000",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5.52 0-10-4.48-10-10a10.94 10.94 0 0 1 2.06-6.36" />
                      <path d="M1 1l22 22" />
                      <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 2.12-5.12" />
                      <path d="M14.12 4.12A10.94 10.94 0 0 1 22 10c-.73 1.29-1.74 2.4-2.95 3.26" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            {loginMsg ? (
              <div
                className={loginOk ? styles.alertSuccess : styles.alertError}
                style={
                  loginOk
                    ? {
                        border: "1px solid rgba(16,185,129,0.35)",
                        background: "rgba(16,185,129,0.12)",
                        color: "#065f46",
                      }
                    : undefined
                }
              >
                {loginMsg}
              </div>
            ) : null}
            <label className={styles.cardSub} style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center" }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-400"
              />
              Manter conectado
            </label>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setLoginOpen(false)}
                disabled={loginLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.loginBtn} login-btn-fun`}
                onClick={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? "Entrando..." : "Entrar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "items" ? (
        <>
          <section className={`${styles.card} ${styles.cardAccent}`}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Cadastrar material</div>
                <div className={styles.cardSub}>Itens usados nos agendamentos.</div>
              </div>
            </div>

            <div className={styles.grid3}>
              <select
                className={styles.input}
                value={itemSchoolId}
                onChange={(e) => setItemSchoolId(e.target.value)}
              >
                <option value="">Selecione a escola</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                placeholder="Categoria (ex: Laboratório)"
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
              />
              <input
                className={styles.input}
                placeholder="Nome do material"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>

            <div className={styles.grid3} style={{ marginTop: 10 }}>
              <input
                type="number"
                min={1}
                className={styles.input}
                placeholder="Quantidade total"
                value={itemQty}
                onChange={(e) => setItemQty(Number(e.target.value))}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={saveItem}
                disabled={!isAdmin || itemSaving || schoolScopeLocked}
              >
                {itemSaving ? "Salvando..." : editingItemId ? "Atualizar" : "+ Cadastrar"}
              </button>
              {editingItemId ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => {
                    setEditingItemId(null);
                    setItemName("");
                    setItemCategory("");
                    setItemQty(1);
                    setItemSchoolId("");
                  }}
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Materiais cadastrados</div>
                <div className={styles.cardSub}>Lista dos recursos disponíveis.</div>
              </div>
              <div className={styles.searchRow}>
                <select
                  className={`${styles.input} ${styles.search}`}
                  value={itemFilterSchoolId}
                  onChange={(e) => setItemFilterSchoolId(e.target.value)}
                >
                  {isSuperAdmin ? <option value="">Todas as escolas</option> : null}
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <input
                  className={`${styles.input} ${styles.search}`}
                  placeholder="Buscar material..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                />
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Escola</th>
                    <th>Categoria</th>
                    <th>Material</th>
                    <th style={{ textAlign: "center" }}>Qtd</th>
                    <th style={{ textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsLoading ? (
                    <TableSkeleton />
                  ) : itemsVisible.length ? (
                    itemsVisible.map((it) => (
                      <tr key={it.id}>
                        <td>{schools.find((s) => s.id === it.school_id)?.name ?? "—"}</td>
                        <td>{it.category}</td>
                        <td>{it.name}</td>
                        <td style={{ textAlign: "center" }}>{it.total_qty}</td>
                        <td style={{ textAlign: "center" }}>
                          <div className={styles.tableActions}>
                            <div className={styles.tableActionsDesktop}>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={() => {
                                  setEditingItemId(it.id);
                                  setItemName(it.name);
                                  setItemCategory(it.category);
                                  setItemQty(it.total_qty);
                                  setItemSchoolId(it.school_id ?? "");
                                }}
                                disabled={!isAdmin || schoolScopeLocked}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnDanger}`}
                                onClick={() => deleteItem(it.id)}
                                disabled={!isAdmin || itemDeletingId === it.id || schoolScopeLocked}
                              >
                                {itemDeletingId === it.id ? "Excluindo..." : "Excluir"}
                              </button>
                            </div>
                            <details className={styles.tableActionsMenu}>
                              <summary className={styles.tableActionsMore}>⋯</summary>
                              <div className={styles.tableActionsMenuList}>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnGhost}`}
                                  onClick={() => {
                                    setEditingItemId(it.id);
                                    setItemName(it.name);
                                    setItemCategory(it.category);
                                    setItemQty(it.total_qty);
                                    setItemSchoolId(it.school_id ?? "");
                                  }}
                                  disabled={!isAdmin || schoolScopeLocked}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnDanger}`}
                                  onClick={() => deleteItem(it.id)}
                                  disabled={!isAdmin || itemDeletingId === it.id || schoolScopeLocked}
                                >
                                  {itemDeletingId === it.id ? "Excluindo..." : "Excluir"}
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className={styles.empty}>
                        Nenhum material encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {isMobileViewport && itemsVisible.length < pagedItems.length ? (
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                style={{ width: "100%", marginTop: 8 }}
                onClick={() => setMobileItemsLimit((prev) => prev + 6)}
              >
                Carregar mais materiais ({pagedItems.length - itemsVisible.length} restantes)
              </button>
            ) : null}
            <div className={styles.pager} style={{ marginTop: 10 }}>
              <div className={styles.pagerLeft}>
                <span className={styles.pageInfo}>
                  Materiais: Página {itemPage} de {itemTotalPages} ({filteredItems.length} no total).
                </span>
              </div>
              <div className={styles.pagerBtns}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setItemPage((p) => Math.max(1, p - 1))}
                  disabled={itemPage <= 1}
                >
                  ← Anterior
                </button>
                {Array.from({ length: itemTotalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={`item-page-${p}`}
                    type="button"
                    className={`${styles.btn} ${p === itemPage ? styles.btnPrimary : styles.btnGhost}`}
                    onClick={() => setItemPage(p)}
                    style={{ minWidth: 36 }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setItemPage((p) => Math.min(itemTotalPages, p + 1))}
                  disabled={itemPage >= itemTotalPages}
                >
                  Próxima →
                </button>
              </div>
            </div>
          </section>
        </>
      ) : null}

      {tab === "schools" ? (
        <>
          <section className={`${styles.card} ${styles.cardAccent}`}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Cadastro e edição de escolas</div>
                <div className={styles.cardSub}>
                  {isSuperAdmin
                    ? "Cadastre novas escolas, ajuste o nome e envie a logo de cada unidade."
                    : "Visualize sua escola e atualize a logo da unidade vinculada."}
                </div>
              </div>
            </div>

            <div className={styles.grid3}>
              <input
                className={styles.input}
                placeholder="Nome da nova escola"
                value={newSchoolName}
                onChange={(e) => setNewSchoolName(e.target.value)}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createSchool}
                disabled={!isAdmin || !isSuperAdmin}
              >
                + Cadastrar escola
              </button>
              <div />
            </div>

            <div className={styles.grid3} style={{ marginTop: 10 }}>
              <select
                className={styles.input}
                value={editingSchoolId ?? ""}
                onChange={(e) => {
                  const id = e.target.value || null;
                  setEditingSchoolId(id);
                  setSchoolLogoFile(null);
                  setSchoolCalendarFile(null);
                  setCalendarSchoolIds(id ? [id] : []);
                  const current = schools.find((s) => s.id === id);
                  setSchoolName(current?.name ?? "");
                }}
              >
                <option value="">Selecione a escola</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                placeholder="Nome da escola"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={saveSchool}
                disabled={!isAdmin || !isSuperAdmin || !editingSchoolId}
              >
                Salvar
              </button>
            </div>

            <div className={styles.grid3} style={{ marginTop: 10 }}>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className={styles.input}
                onChange={(e) => setSchoolLogoFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={uploadSchoolLogo}
                disabled={!isAdmin || !editingSchoolId || !schoolLogoFile}
              >
                Enviar logo da escola
              </button>
              <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                {schoolLogoFile ? `Arquivo: ${schoolLogoFile.name}` : "Sem arquivo selecionado"}
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop: "1px solid rgba(148,163,184,0.35)", paddingTop: 12 }}>
              <div className={styles.cardSub}>Calendário escolar em PDF</div>
              <div className={styles.grid3} style={{ marginTop: 8 }}>
                <input
                  type="file"
                  accept="application/pdf"
                  className={styles.input}
                  onChange={(e) => setSchoolCalendarFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={uploadSchoolCalendar}
                  disabled={!isAdmin || !schoolCalendarFile || !calendarSchoolIds.length}
                >
                  Enviar PDF do calendário
                </button>
                <div style={{ display: "flex", alignItems: "center", fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                  {schoolCalendarFile ? `PDF: ${schoolCalendarFile.name}` : "Sem PDF selecionado"}
                </div>
              </div>

              <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
                {schools.map((s) => (
                  <button
                    key={`cal-${s.id}`}
                    type="button"
                    onClick={() => toggleCalendarSchoolId(s.id)}
                    className={`${styles.pill} ${styles.pillButton}`}
                    style={{
                      background: calendarSchoolIds.includes(s.id) ? "rgba(14,165,233,.2)" : "rgba(255,255,255,.9)",
                    }}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#64748b", fontWeight: 700 }}>
                Você pode aplicar o mesmo PDF para várias escolas no mesmo envio.
              </div>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Grupos de Recursos Compartilhados</div>
                <div className={styles.cardSub}>
                  Use para prédios com materiais/sala de informática compartilhados entre escolas.
                </div>
              </div>
            </div>

            <div className={styles.grid3}>
              <input
                className={styles.input}
                placeholder="Nome do grupo (ex: Polo Centro)"
                value={newResourceGroupName}
                onChange={(e) => setNewResourceGroupName(e.target.value)}
              />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={createResourceGroup}
                disabled={!isAdmin || !isSuperAdmin}
              >
                + Criar grupo
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => void loadResourceGroups()}
                disabled={!isAdmin || resourceGroupsLoading}
              >
                {resourceGroupsLoading ? "Carregando..." : "Atualizar grupos"}
              </button>
            </div>

            <div className={styles.grid3} style={{ marginTop: 10 }}>
              <select
                className={styles.input}
                value={linkSchoolId}
                onChange={(e) => setLinkSchoolId(e.target.value)}
              >
                <option value="">Selecione a escola</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.input}
                value={linkGroupId}
                onChange={(e) => setLinkGroupId(e.target.value)}
              >
                <option value="">Sem grupo (isolada)</option>
                {resourceGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={linkSchoolToResourceGroup}
                disabled={!isAdmin || !isSuperAdmin || !linkSchoolId}
              >
                Salvar vínculo
              </button>
            </div>

            <div className={styles.tableWrap} style={{ marginTop: 12 }}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Escolas vinculadas</th>
                  </tr>
                </thead>
                <tbody>
                  {resourceGroupsLoading ? (
                    <TableSkeleton />
                  ) : resourceGroups.length ? (
                    resourceGroups.map((g) => (
                      <tr key={g.id}>
                        <td>{g.name}</td>
                        <td className={styles.muted}>
                          {(g.school_ids ?? [])
                            .map((sid) => schools.find((s) => s.id === sid)?.name ?? sid)
                            .join(", ") || "Sem escola vinculada"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={2} className={styles.empty}>
                        Nenhum grupo de recursos cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Escolas cadastradas</div>
                <div className={styles.cardSub}>Listagem das unidades.</div>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "center" }}>Logo</th>
                    <th>Escola</th>
                    <th style={{ textAlign: "center" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {schoolsLoading ? (
                    <TableSkeleton />
                  ) : schools.length ? (
                    schools.map((s) => (
                      <tr key={s.id}>
                        <td style={{ textAlign: "center" }}>
                          {s.logo_url ? (
                            <Image
                              src={s.logo_url}
                              alt={`Logo de ${s.name}`}
                              width={36}
                              height={36}
                              style={{ width: 36, height: 36, objectFit: "contain", margin: "0 auto" }}
                            />
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>{s.name}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className={`${styles.badge} ${s.active ? styles.badgeOn : styles.badgeOff}`}>
                            <span className={styles.badgeDot} />
                            {s.active ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className={styles.empty}>
                        Nenhuma escola encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {tab === "classes" ? (
        <>
          <section className={`${styles.card} ${styles.cardAccent}`}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Cadastrar turma</div>
                <div className={styles.cardSub}>Turmas por escola e período.</div>
              </div>
              <div className={styles.searchRow}>
                <select
                  className={`${styles.input} ${styles.search}`}
                  value={classYear}
                  onChange={(e) => setClassYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className={styles.grid3}>
              <input
                className={styles.input}
                placeholder="Nome da turma"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
              />
              <select
                className={styles.input}
                value={classSchoolId}
                onChange={(e) => setClassSchoolId(e.target.value)}
              >
                <option value="">Selecione a escola</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.input}
                value={classPeriod}
                onChange={(e) => setClassPeriod(e.target.value)}
              >
                {visiblePeriodOptions.map((period) => (
                  <option key={period} value={period}>
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.grid3} style={{ marginTop: 10 }}>
              <div />
              <div />
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={saveClass}
                disabled={!isAdmin || schoolScopeLocked}
              >
                {editingClassId ? "Atualizar" : "Cadastrar"}
              </button>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>Turmas cadastradas</div>
                <div className={styles.cardSub}>Filtro por escola, período e ano.</div>
              </div>
              <div className={styles.searchRow}>
                <select
                  className={`${styles.input} ${styles.search}`}
                  value={classFilterSchoolId}
                  onChange={(e) => setClassFilterSchoolId(e.target.value)}
                >
                  {isSuperAdmin ? <option value="">Todas as escolas</option> : null}
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <select
                  className={`${styles.input} ${styles.search}`}
                  value={classFilterPeriod}
                  onChange={(e) => setClassFilterPeriod(e.target.value)}
                >
                  <option value="">Todos os períodos</option>
                  {visiblePeriodOptions.map((period) => (
                    <option key={period} value={period}>
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.pager} style={{ marginBottom: 10 }}>
              <div className={styles.pagerLeft}>
                <span className={styles.pageInfo}>
                  Exibindo {visibleClasses.length} de {classes.length} turma(s) • Página {classPage} de {classTotalPages}
                </span>
              </div>
              <div className={styles.pagerBtns}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setClassPage((p) => Math.max(1, p - 1))}
                  disabled={classPage <= 1}
                >
                  ← Anterior
                </button>
                {Array.from({ length: classTotalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={`class-page-${p}`}
                    type="button"
                    className={`${styles.btn} ${p === classPage ? styles.btnPrimary : styles.btnGhost}`}
                    onClick={() => setClassPage(p)}
                    style={{ minWidth: 36 }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnGhost}`}
                  onClick={() => setClassPage((p) => Math.min(classTotalPages, p + 1))}
                  disabled={classPage >= classTotalPages}
                >
                  Próxima →
                </button>
              </div>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Turma</th>
                    <th>Escola</th>
                    <th>Período</th>
                    <th style={{ textAlign: "center" }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {classesLoading ? (
                    <TableSkeleton />
                  ) : visibleClasses.length ? (
                    visibleClasses.map((c) => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.schools?.name ?? "—"}</td>
                        <td>{c.period}</td>
                        <td style={{ textAlign: "center" }}>
                          <div className={styles.tableActions}>
                            <div className={styles.tableActionsDesktop}>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnGhost}`}
                                onClick={() => {
                                  setEditingClassId(c.id);
                                  setClassName(c.name);
                                  setClassSchoolId(c.school_id);
                                  setClassPeriod(c.period);
                                }}
                                disabled={!isAdmin || schoolScopeLocked}
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                className={`${styles.btn} ${styles.btnDanger}`}
                                onClick={() => deleteClass(c.id)}
                                disabled={!isAdmin || schoolScopeLocked}
                              >
                                Excluir
                              </button>
                            </div>
                            <details className={styles.tableActionsMenu}>
                              <summary className={styles.tableActionsMore}>⋯</summary>
                              <div className={styles.tableActionsMenuList}>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnGhost}`}
                                  onClick={() => {
                                    setEditingClassId(c.id);
                                    setClassName(c.name);
                                    setClassSchoolId(c.school_id);
                                    setClassPeriod(c.period);
                                  }}
                                  disabled={!isAdmin || schoolScopeLocked}
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  className={`${styles.btn} ${styles.btnDanger}`}
                                  onClick={() => deleteClass(c.id)}
                                  disabled={!isAdmin || schoolScopeLocked}
                                >
                                  Excluir
                                </button>
                              </div>
                            </details>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className={styles.empty}>
                        Nenhuma turma encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={cloneClassesFromYear}
                disabled={!isAdmin}
              >
                Iniciar novo ano (copiar turmas)
              </button>
            </div>
          </section>
        </>
      ) : null}

      {itemConfirmOpen ? (
        <div
          onClick={() => {
            if (itemDeletingId) return;
            setItemConfirmOpen(false);
            setPendingItem(null);
          }}
          className={styles.modalOverlay}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(15,23,42,0.55)",
            width: "100vw",
            height: "100vh",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={styles.modalCard}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "white",
              borderRadius: 18,
              border: "1px solid rgba(15,23,42,0.12)",
              padding: 16,
              boxShadow: "0 18px 44px rgba(2,6,23,.22)",
              display: "grid",
              gap: 10,
            }}
          >
            <div className={styles.cardTitle} style={{ textAlign: "center" }}>
              Excluir material?
            </div>
            <div className={styles.cardSub} style={{ textAlign: "center" }}>
              {pendingItem?.name} • {pendingItem?.category}
            </div>
            <div className={styles.actionRow} style={{ justifyContent: "center", marginTop: 6 }}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  if (itemDeletingId) return;
                  setItemConfirmOpen(false);
                  setPendingItem(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={confirmDeleteItem}
                disabled={!!itemDeletingId}
              >
                {itemDeletingId ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "users" ? (
        <>
      {resetResult ? (
        <section className={`${styles.card} ${styles.draftCard}`}>
          <div className={styles.cardTitle}>Senha redefinida</div>
          <div className={styles.cardSub}>
            Entregue a nova senha ao usuário.
          </div>
          <div className={styles.draftGrid}>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Professor</span>
              <span className={styles.draftValue}>{resetResult.name}</span>
            </div>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Usuário</span>
              <span className={styles.draftValue}>{resetResult.username}</span>
            </div>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Senha</span>
              <span className={styles.draftValue}>{resetResult.password}</span>
            </div>
          </div>
        </section>
      ) : null}
      {createResult ? (
        <section className={`${styles.card} ${styles.draftCard}`}>
          <div className={styles.cardTitle}>Acesso criado</div>
          <div className={styles.cardSub}>
            Entregue o usuário e a senha inicial.
          </div>
          <div className={styles.draftGrid}>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Professor</span>
              <span className={styles.draftValue}>{createResult.name}</span>
            </div>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Usuário</span>
              <span className={styles.draftValue}>{createResult.username}</span>
            </div>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Senha</span>
              <span className={styles.draftValue}>{createResult.password}</span>
            </div>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Cargo</span>
              <span className={styles.draftValue}>{roleLabel(createResult.role)}</span>
            </div>
            <div className={styles.draftItem}>
              <span className={styles.draftLabel}>Perfil</span>
              <span className={styles.draftValue}>
                {isManagementRole(createResult.role) ? "Gestão" : roleLabel(createResult.role)}
              </span>
            </div>
          </div>
        </section>
      ) : null}

      {/* CADASTRO + BUSCA */}
      <section className={`${styles.card} ${styles.cardAccent}`}>
        <div className={styles.cardTop}>
          <div>
            <div className={styles.cardTitle}>Cadastrar usuário</div>
            <div className={styles.cardSub}>Informe nome, cargo e usuário (nome.ultimo).</div>
          </div>

          <div className={styles.searchRow}>
            <select
              className={`${styles.input} ${styles.search}`}
              value={userFilterSchoolId}
              onChange={(e) => setUserFilterSchoolId(e.target.value)}
              title="Filtrar por escola"
            >
              {isSuperAdmin ? <option value="">Todas as escolas</option> : null}
              {schools.map((s) => (
                <option key={`user-filter-${s.id}`} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              className={`${styles.input} ${styles.search}`}
              placeholder="Buscar por nome ou usuário…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className={styles.grid3}>
          <input
            className={styles.input}
            placeholder="Nome completo"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className={styles.input}
            value={createRole}
            onChange={(e) => setCreateRole(e.target.value as UserRole)}
          >
            <option value="professor">Professor(a)</option>
            <option value="estagiario">Estagiário(a)</option>
            <option value="diretor">Diretor(a)</option>
            <option value="secretaria">Secretaria</option>
            <option value="coordenador">Coordenador(a)</option>
          </select>
          <input
            className={styles.input}
            placeholder="Usuário (ex: felipe.rocha)"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className={styles.grid3} style={{ marginTop: 8 }}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={addTeacher}
            disabled={!isAdmin || schoolScopeLocked}
          >
            + Cadastrar
          </button>
          <div />
          <div />
        </div>

        <div className={styles.grid3} style={{ marginTop: 8 }}>
          <select
            className={styles.input}
            value={birthDay}
            onChange={(e) => setBirthDay(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Dia do nascimento (opcional)</option>
            {Array.from({ length: 31 }).map((_, idx) => (
              <option key={idx + 1} value={idx + 1}>
                {idx + 1}
              </option>
            ))}
          </select>

          <select
            className={styles.input}
            value={birthMonth}
            onChange={(e) => setBirthMonth(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Mês do nascimento (opcional)</option>
            {[
              "Janeiro",
              "Fevereiro",
              "Março",
              "Abril",
              "Maio",
              "Junho",
              "Julho",
              "Agosto",
              "Setembro",
              "Outubro",
              "Novembro",
              "Dezembro",
            ].map((label, idx) => (
              <option key={label} value={idx + 1}>
                {label}
              </option>
            ))}
          </select>
          <div />
        </div>

        <div style={{ marginTop: 10 }}>
          <div className={styles.cardSub}>Escolas do usuário (selecione ao menos 1)</div>
          {schools.length ? (
            <div className={styles.checkList} style={{ marginTop: 6 }}>
              {schools.map((s) => {
                const checked = schoolIds.includes(s.id);
                return (
                  <label key={s.id} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSchoolIds((prev) =>
                          checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        )
                      }
                    />
                    {s.name}
                  </label>
                );
              })}
            </div>
          ) : (
            <div className={styles.cardSub} style={{ marginTop: 6 }}>
              Nenhuma escola cadastrada.
            </div>
          )}
        </div>

        <div style={{ marginTop: 10 }}>
          <div className={styles.cardSub}>Turmas do professor (selecione ao menos 1)</div>
          {createClassOptions.length ? (
            <div className={styles.classSelectStack}>
              <select
                className={styles.input}
                value={createClassPicker}
                onChange={(e) => {
                  const value = e.target.value;
                  setCreateClassPicker("");
                  if (!value) return;
                  setCreateClassIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
                }}
              >
                <option value="">Selecionar turma para adicionar…</option>
                {createAvailableClassOptions.map((c) => {
                  const schoolName = schools.find((s) => s.id === c.school_id)?.name ?? "Escola";
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} • {c.period} • {schoolName}
                    </option>
                  );
                })}
              </select>
              <div className={styles.selectedClassList}>
                {createClassIds.map((classId) => (
                  <div key={classId} className={styles.selectedClassItem}>
                    <span>{classLabel(classId)}</span>
                    <button
                      type="button"
                      className={styles.selectedClassRemove}
                      onClick={() => setCreateClassIds((prev) => prev.filter((id) => id !== classId))}
                      aria-label="Remover turma"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.cardSub} style={{ marginTop: 6 }}>
              {bindingClassesLoading
                ? "Carregando turmas..."
                : "Selecione escola(s) para habilitar as turmas."}
            </div>
          )}
        </div>

        <div style={{ marginTop: 12, borderTop: "1px solid rgba(148,163,184,.35)", paddingTop: 12 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 13 }}>
            <input
              type="checkbox"
              checked={createAsAdmin}
              onChange={(e) => setCreateRole(e.target.checked ? "diretor" : "professor")}
              style={{ width: 16, height: 16 }}
            />
            Perfil de gestão (Diretor(a) ou Secretaria/Coordenador(a))
          </label>

          {createAsAdmin ? (
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div>
                <div className={styles.cardSub}>Períodos permitidos</div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {visiblePeriodOptions.map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => toggleCreateAdminPeriod(period)}
                      className={`${styles.pill} ${styles.pillButton}`}
                      style={{
                        background: createAdminPeriods.includes(period)
                          ? "rgba(16,185,129,.2)"
                          : "rgba(255,255,255,.9)",
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
                <select
                  className={styles.input}
                  style={{ marginTop: 8 }}
                  value={createAdminDefaultPeriod}
                  onChange={(e) => setCreateAdminDefaultPeriod(e.target.value)}
                >
                  {createAdminPeriods.map((period) => (
                    <option key={period} value={period}>
                      Padrão: {period}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                  <div className={styles.cardSub}>Escolas permitidas (do professor)</div>
                <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {createAdminLocationOptions.map((location) => (
                    <button
                      key={location}
                      type="button"
                      onClick={() => toggleCreateAdminLocation(location)}
                      className={`${styles.pill} ${styles.pillButton}`}
                      style={{
                        background: createAdminLocations.includes(location)
                          ? "rgba(14,165,233,.2)"
                          : "rgba(255,255,255,.9)",
                      }}
                    >
                      {location}
                    </button>
                  ))}
                  {!createAdminLocationOptions.length ? (
                    <span className={styles.muted}>Marque ao menos uma escola do professor para liberar o admin.</span>
                  ) : null}
                </div>
                <select
                  className={styles.input}
                  style={{ marginTop: 8 }}
                  value={createAdminDefaultLocation}
                  onChange={(e) => setCreateAdminDefaultLocation(e.target.value)}
                >
                  {createAdminLocations.map((location) => (
                    <option key={location} value={location}>
                      Padrão: {location}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* PAGINAÇÃO */}
      <div className={styles.pager}>
        <div className={styles.pagerLeft}>
          <span className={styles.pageInfo}>
            Ativos: Página {activeUserPage} de {activeUserTotalPages} ({activeTeachers.length} no total).
          </span>
        </div>
        <div className={styles.pagerBtns}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setActiveUserPage((p) => Math.max(1, p - 1))}
            disabled={activeUserPage <= 1}
          >
            ← Anterior
          </button>
          {Array.from({ length: activeUserTotalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={`active-user-page-${p}`}
              type="button"
              className={`${styles.btn} ${p === activeUserPage ? styles.btnPrimary : styles.btnGhost}`}
              onClick={() => setActiveUserPage(p)}
              style={{ minWidth: 36 }}
            >
              {p}
            </button>
          ))}
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            onClick={() => setActiveUserPage((p) => Math.min(activeUserTotalPages, p + 1))}
            disabled={activeUserPage >= activeUserTotalPages}
          >
            Próxima →
          </button>
        </div>
      </div>

      {/* TABELA - ATIVOS */}
      <section className={styles.card}>
        <div className={styles.cardTop}>
          <div>
            <div className={styles.cardTitle}>Professores ativos</div>
            <div className={styles.cardSub}>Somente os ativos aparecem no agendamento.</div>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Professor</th>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Escolas</th>
                <th>Turmas</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : activeTeachersVisible.length ? (
                activeTeachersVisible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className={styles.nameRow}>
                        <span className={styles.avatar}>{(t.name?.[0] ?? "P").toUpperCase()}</span>
                        <div>
                          <div className={styles.name}>
                            {t.name} {isBirthdayToday(t) ? <span className={styles.badgeBirthday}>🎂 Hoje</span> : null}
                          </div>
                          <div className={styles.mini}>
                            {roleLabel(t.management_role)} • Cadastrado
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className={styles.muted}>{formatUsername(t.email)}</td>
                    <td>
                      <span className={`${styles.badge} ${t.profile_type === "admin_gestao" ? styles.badgeOn : styles.badgeOff}`}>
                        <span className={styles.badgeDot} />
                        {t.profile_type === "admin_gestao" ? "Gestão" : roleLabel(t.management_role)}
                      </span>
                    </td>
                    <td className={styles.muted}>{formatTeacherSchools(t.school_ids)}</td>
                    <td className={styles.muted}>{formatTeacherClasses(t.class_ids)}</td>

                    <td style={{ textAlign: "center" }}>
                      <span className={`${styles.badge} ${t.active ? styles.badgeOn : styles.badgeOff}`}>
                        <span className={styles.badgeDot} />
                        {t.active ? "Ativo" : "Inativo"}
                      </span>
                    </td>

                    <td style={{ textAlign: "center" }}>
                      <div className={styles.tableActions}>
                        <div className={styles.tableActionsDesktop}>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => askToggle(t)}
                            disabled={!isAdmin || schoolScopeLocked}
                          >
                            {t.active ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => openEdit(t)}
                            disabled={!isAdmin || schoolScopeLocked}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => resetUserAccess(t)}
                            disabled={!isAdmin || resetLoadingId === t.id || schoolScopeLocked}
                          >
                            {resetLoadingId === t.id ? "Redefinindo..." : "Redefinir senha"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={() => deleteUserAccess(t)}
                            disabled={!isAdmin || deleteLoadingId === t.id || schoolScopeLocked}
                          >
                            {deleteLoadingId === t.id ? "Apagando..." : "Apagar usuário"}
                          </button>
                        </div>
                        <div className={styles.tableActionsMenu}>
                          <button
                            type="button"
                            className={styles.tableActionsMore}
                            onClick={() => setMobileTeacherActions(t)}
                            aria-label="Mais ações"
                          >
                            ⋯
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Nenhum professor encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isMobileViewport && activeTeachersVisible.length < pagedTeachers.length ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => setMobileActiveLimit((prev) => prev + 6)}
          >
            Carregar mais professores ({pagedTeachers.length - activeTeachersVisible.length} restantes)
          </button>
        ) : null}
      </section>

      {/* TABELA - INATIVOS */}
      <section className={styles.card} style={{ marginTop: 16 }}>
        <div className={styles.cardTop}>
          <div>
            <div className={styles.cardTitle}>Professores desativados</div>
            <div className={styles.cardSub}>Não aparecem no agendamento enquanto estiverem inativos.</div>
          </div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Professor</th>
                <th>Usuário</th>
                <th>Perfil</th>
                <th>Escolas</th>
                <th>Turmas</th>
                <th style={{ textAlign: "center" }}>Status</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableSkeleton />
              ) : inactiveTeachersVisible.length ? (
                inactiveTeachersVisible.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div className={styles.nameRow}>
                        <span className={styles.avatar}>{(t.name?.[0] ?? "P").toUpperCase()}</span>
                        <div>
                          <div className={styles.name}>{t.name}</div>
                          <div className={styles.mini}>
                            {roleLabel(t.management_role)} • Cadastrado
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.muted}>{formatUsername(t.email)}</td>
                    <td>
                      <span className={`${styles.badge} ${t.profile_type === "admin_gestao" ? styles.badgeOn : styles.badgeOff}`}>
                        <span className={styles.badgeDot} />
                        {t.profile_type === "admin_gestao" ? "Gestão" : roleLabel(t.management_role)}
                      </span>
                    </td>
                    <td className={styles.muted}>{formatTeacherSchools(t.school_ids)}</td>
                    <td className={styles.muted}>{formatTeacherClasses(t.class_ids)}</td>
                    <td style={{ textAlign: "center" }}>
                      <span className={`${styles.badge} ${styles.badgeOff}`}>
                        <span className={styles.badgeDot} />
                        Inativo
                      </span>
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <div className={styles.tableActions}>
                        <div className={styles.tableActionsDesktop}>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => askToggle(t)}
                            disabled={!isAdmin || schoolScopeLocked}
                          >
                            Ativar
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => openEdit(t)}
                            disabled={!isAdmin || schoolScopeLocked}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnGhost}`}
                            onClick={() => resetUserAccess(t)}
                            disabled={!isAdmin || resetLoadingId === t.id || schoolScopeLocked}
                          >
                            {resetLoadingId === t.id ? "Redefinindo..." : "Redefinir senha"}
                          </button>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.btnDanger}`}
                            onClick={() => deleteUserAccess(t)}
                            disabled={!isAdmin || deleteLoadingId === t.id || schoolScopeLocked}
                          >
                            {deleteLoadingId === t.id ? "Apagando..." : "Apagar usuário"}
                          </button>
                        </div>
                        <div className={styles.tableActionsMenu}>
                          <button
                            type="button"
                            className={styles.tableActionsMore}
                            onClick={() => setMobileTeacherActions(t)}
                            aria-label="Mais ações"
                          >
                            ⋯
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Nenhum professor desativado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {isMobileViewport && inactiveTeachersVisible.length < pagedInactiveTeachers.length ? (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost}`}
            style={{ width: "100%", marginTop: 8 }}
            onClick={() => setMobileInactiveLimit((prev) => prev + 6)}
          >
            Carregar mais desativados ({pagedInactiveTeachers.length - inactiveTeachersVisible.length} restantes)
          </button>
        ) : null}
        <div className={styles.pager} style={{ marginTop: 10 }}>
          <div className={styles.pagerLeft}>
            <span className={styles.pageInfo}>
              Desativados: Página {inactiveUserPage} de {inactiveUserTotalPages} ({inactiveTeachers.length} no total).
            </span>
          </div>
          <div className={styles.pagerBtns}>
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => setInactiveUserPage((p) => Math.max(1, p - 1))}
              disabled={inactiveUserPage <= 1}
            >
              ← Anterior
            </button>
            {Array.from({ length: inactiveUserTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={`inactive-user-page-${p}`}
                type="button"
                className={`${styles.btn} ${p === inactiveUserPage ? styles.btnPrimary : styles.btnGhost}`}
                onClick={() => setInactiveUserPage(p)}
                style={{ minWidth: 36 }}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              className={`${styles.btn} ${styles.btnGhost}`}
              onClick={() => setInactiveUserPage((p) => Math.min(inactiveUserTotalPages, p + 1))}
              disabled={inactiveUserPage >= inactiveUserTotalPages}
            >
              Próxima →
            </button>
          </div>
        </div>
      </section>

        </>
      ) : null}

      {mobileTeacherActions ? (
        <div
          className={styles.quickActionsOverlay}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMobileTeacherActions(null);
          }}
        >
          <div className={styles.quickActionsCard} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.quickActionsHeader}>
              <div>
                <div className={styles.quickActionsTitle}>{mobileTeacherActions.name}</div>
                <div className={styles.quickActionsSub}>Escolha uma ação</div>
              </div>
              <button
                type="button"
                className={styles.quickActionsClose}
                onClick={() => setMobileTeacherActions(null)}
                aria-label="Fechar ações"
              >
                ✕
              </button>
            </div>
            <div className={styles.quickActionsList}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setMobileTeacherActions(null);
                  askToggle(mobileTeacherActions);
                }}
                disabled={!isAdmin || schoolScopeLocked}
              >
                {mobileTeacherActions.active ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setMobileTeacherActions(null);
                  openEdit(mobileTeacherActions);
                }}
                disabled={!isAdmin || schoolScopeLocked}
              >
                Editar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => {
                  setMobileTeacherActions(null);
                  void resetUserAccess(mobileTeacherActions);
                }}
                disabled={!isAdmin || resetLoadingId === mobileTeacherActions.id || schoolScopeLocked}
              >
                {resetLoadingId === mobileTeacherActions.id ? "Redefinindo..." : "Redefinir senha"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnDanger}`}
                onClick={() => {
                  setMobileTeacherActions(null);
                  void deleteUserAccess(mobileTeacherActions);
                }}
                disabled={!isAdmin || deleteLoadingId === mobileTeacherActions.id || schoolScopeLocked}
              >
                {deleteLoadingId === mobileTeacherActions.id ? "Apagando..." : "Apagar usuário"}
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setMobileTeacherActions(null)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL CONFIRMAÇÃO */}
      {confirmOpen && pendingTeacher && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeConfirm();
          }}
        >
          <div
            className={styles.modal}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>
                  Confirmar {pendingTeacher.active ? "desativação" : "ativação"}
                </div>
                <div className={styles.modalSub}>
                  {pendingTeacher.active
                    ? "Esse professor deixará de aparecer no agendamento."
                    : "Esse professor voltará a aparecer no agendamento."}
                </div>
              </div>

              <button
                type="button"
                className={styles.toastClose}
                onClick={closeConfirm}
                aria-label="Fechar"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalRow}>
                <div className={styles.modalAvatar}>
                  {(pendingTeacher.name?.[0] ?? "P").toUpperCase()}
                </div>
                <div>
                  <div className={styles.modalName}>{pendingTeacher.name}</div>
                  <div className={styles.modalMuted}>{formatUsername(pendingTeacher.email)}</div>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={closeConfirm}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={confirmToggle}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && editTeacher && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div className={`${styles.modal} ${styles.modalWide}`} onMouseDown={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <div className={styles.modalTitle}>Editar professor</div>
                <div className={styles.modalSub}>Atualize dados e perfil de acesso.</div>
              </div>

              <button
                type="button"
                className={styles.toastClose}
                onClick={closeEdit}
                aria-label="Fechar"
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div className={`${styles.modalBody} ${styles.modalBodyScroll}`} style={{ display: "grid", gap: 10 }}>
              <input
                className={styles.input}
                placeholder="Nome do professor"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className={styles.grid3} style={{ gap: 10 }}>
                <select
                  className={styles.input}
                  value={editBirthDay}
                  onChange={(e) => setEditBirthDay(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Dia do nascimento</option>
                  {Array.from({ length: 31 }).map((_, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {idx + 1}
                    </option>
                  ))}
                </select>
                <select
                  className={styles.input}
                  value={editBirthMonth}
                  onChange={(e) => setEditBirthMonth(e.target.value ? Number(e.target.value) : "")}
                >
                  <option value="">Mês do nascimento</option>
                  {[
                    "Janeiro",
                    "Fevereiro",
                    "Março",
                    "Abril",
                    "Maio",
                    "Junho",
                    "Julho",
                    "Agosto",
                    "Setembro",
                    "Outubro",
                    "Novembro",
                    "Dezembro",
                  ].map((label, idx) => (
                    <option key={label} value={idx + 1}>
                      {label}
                    </option>
                  ))}
                </select>
                <div />
              </div>

              <div>
                <div className={styles.cardSub}>Escolas do usuário (selecione ao menos 1)</div>
                {schools.length ? (
                  <div className={styles.checkList} style={{ marginTop: 6 }}>
                    {schools.map((s) => {
                      const checked = editSchoolIds.includes(s.id);
                      return (
                        <label key={s.id} className={styles.checkItem}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setEditSchoolIds((prev) =>
                                checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                              )
                            }
                          />
                          {s.name}
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <div className={styles.cardSub} style={{ marginTop: 6 }}>
                    Nenhuma escola cadastrada.
                  </div>
                )}
              </div>

              <div>
                <div className={styles.cardSub}>Turmas do professor (selecione ao menos 1)</div>
                {editClassOptions.length ? (
                  <div className={styles.classSelectStack}>
                    <select
                      className={styles.input}
                      value={editClassPicker}
                      onChange={(e) => {
                        const value = e.target.value;
                        setEditClassPicker("");
                        if (!value) return;
                        setEditClassIds((prev) => (prev.includes(value) ? prev : [...prev, value]));
                      }}
                    >
                      <option value="">Selecionar turma para adicionar…</option>
                      {editAvailableClassOptions.map((c) => {
                        const schoolName = schools.find((s) => s.id === c.school_id)?.name ?? "Escola";
                        return (
                          <option key={c.id} value={c.id}>
                            {c.name} • {c.period} • {schoolName}
                          </option>
                        );
                      })}
                    </select>
                    <div className={styles.selectedClassList}>
                      {editClassIds.map((classId) => (
                        <div key={classId} className={styles.selectedClassItem}>
                          <span>{classLabel(classId)}</span>
                          <button
                            type="button"
                            className={styles.selectedClassRemove}
                            onClick={() => setEditClassIds((prev) => prev.filter((id) => id !== classId))}
                            aria-label="Remover turma"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.cardSub} style={{ marginTop: 6 }}>
                    {bindingClassesLoading
                      ? "Carregando turmas..."
                      : "Selecione escola(s) para habilitar as turmas."}
                  </div>
                )}
              </div>

              {isSuperAdmin ? (
                <div style={{ marginTop: 4, borderTop: "1px solid rgba(148,163,184,.35)", paddingTop: 10 }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontWeight: 900, fontSize: 13 }}>
                    <input
                      type="checkbox"
                      checked={editIsAdmin}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setEditIsAdmin(checked);
                        if (!checked && isManagementRole(editRole)) setEditRole("professor");
                        else if (checked && !isManagementRole(editRole)) setEditRole("diretor");
                      }}
                      style={{ width: 16, height: 16 }}
                    />
                    Definir este usuário com perfil de gestão
                  </label>
                  <select
                    className={styles.input}
                    style={{ marginTop: 8 }}
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                  >
                    <option value="professor">Professor(a)</option>
                    <option value="estagiario">Estagiário(a)</option>
                    <option value="diretor">Diretor(a)</option>
                    <option value="secretaria">Secretaria</option>
                    <option value="coordenador">Coordenador(a)</option>
                  </select>
                  <div className={styles.cardSub} style={{ marginTop: 6 }}>
                    Perfil atual: {editIsAdmin ? "Gestão" : roleLabel(editRole)} • Cargo: {roleLabel(editRole)}
                  </div>
                </div>
              ) : null}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={closeEdit}
                disabled={editLoading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={confirmEdit}
                disabled={editLoading}
              >
                {editLoading ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toastOpen && (
        <div className={styles.toastWrap} aria-live="polite">
          <div className={`${styles.toast} ${toastType === "ok" ? styles.toastOk : styles.toastErr}`}>
            <div className={styles.toastTop}>
              <div>
                <div className={styles.toastTitle}>{toastTitle}</div>
                <div className={styles.toastMsg}>{toastMsg}</div>
              </div>
              <button type="button" className={styles.toastClose} onClick={closeToast} aria-label="Fechar toast">
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
