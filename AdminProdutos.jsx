import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Package, Plus, Pencil, Trash2, Upload, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";

export default function AdminProdutos() {
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduto, setEditingProduto] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    sabor: "chocolate",
    preco: "",
    imagem_url: "",
    estoque: "",
    estoque_minimo: "10",
    ativo: true,
    destaque: false,
    categoria: "classico"
  });

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (currentUser.role !== "admin") {
        window.location.href = createPageUrl("Home");
      }
      setUser(currentUser);
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['admin-produtos'],
    queryFn: () => base44.entities.Produto.list("-created_date"),
    enabled: !!user,
    initialData: [],
  });

  const criarProdutoMutation = useMutation({
    mutationFn: (dados) => base44.entities.Produto.create(dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setShowDialog(false);
      resetForm();
      toast.success("Produto criado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar produto");
    }
  });

  const atualizarProdutoMutation = useMutation({
    mutationFn: ({ id, dados }) => base44.entities.Produto.update(id, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      setShowDialog(false);
      resetForm();
      toast.success("Produto atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar produto");
    }
  });

  const deletarProdutoMutation = useMutation({
    mutationFn: (id) => base44.entities.Produto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-produtos'] });
      queryClient.invalidateQueries({ queryKey: ['produtos'] });
      toast.success("Produto removido com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao remover produto");
    }
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB.");
      return;
    }

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, imagem_url: file_url });
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao enviar imagem");
    }
    setUploadingImage(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.preco || !formData.estoque) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const dados = {
      ...formData,
      preco: parseFloat(formData.preco),
      estoque: parseInt(formData.estoque),
      estoque_minimo: parseInt(formData.estoque_minimo)
    };

    if (editingProduto) {
      atualizarProdutoMutation.mutate({ id: editingProduto.id, dados });
    } else {
      criarProdutoMutation.mutate(dados);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      descricao: "",
      sabor: "chocolate",
      preco: "",
      imagem_url: "",
      estoque: "",
      estoque_minimo: "10",
      ativo: true,
      destaque: false,
      categoria: "classico"
    });
    setEditingProduto(null);
  };

  const openEditDialog = (produto) => {
    setEditingProduto(produto);
    setFormData({
      nome: produto.nome,
      descricao: produto.descricao || "",
      sabor: produto.sabor,
      preco: produto.preco.toString(),
      imagem_url: produto.imagem_url || "",
      estoque: produto.estoque.toString(),
      estoque_minimo: produto.estoque_minimo.toString(),
      ativo: produto.ativo,
      destaque: produto.destaque || false,
      categoria: produto.categoria
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    resetForm();
    setShowDialog(true);
  };

  const produtosEstoqueBaixo = produtos.filter(p => 
    p.estoque <= p.estoque_minimo && p.ativo
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
 