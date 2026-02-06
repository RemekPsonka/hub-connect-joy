import { useState } from 'react';
import { Plus, Trash2, Pencil, X, Check, Package, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  useDealProducts,
  useCreateDealProduct,
  useUpdateDealProduct,
  useDeleteDealProduct,
  DealProduct,
} from '@/hooks/useDealProducts';

const productSchema = z.object({
  name: z.string().min(1, 'Nazwa jest wymagana'),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0.01, 'Ilość musi być > 0'),
  unit_price: z.coerce.number().min(0, 'Cena nie może być ujemna'),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface DealProductsCardProps {
  dealId: string;
  currency: string;
  onValueChange?: (total: number) => void;
}

export function DealProductsCard({ dealId, currency, onValueChange }: DealProductsCardProps) {
  const { data: products = [], isLoading } = useDealProducts(dealId);
  const createProduct = useCreateDealProduct();
  const updateProduct = useUpdateDealProduct();
  const deleteProduct = useDeleteDealProduct();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
    },
  });

  const editForm = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
  });

  const totalValue = products.reduce((sum, p) => sum + Number(p.total_price), 0);

  const formatCurrency = (value: number) =>
    value.toLocaleString('pl-PL', { style: 'currency', currency });

  const handleAdd = async (values: ProductFormValues) => {
    await createProduct.mutateAsync({
      deal_id: dealId,
      name: values.name,
      description: values.description || null,
      quantity: values.quantity,
      unit_price: values.unit_price,
    });
    form.reset();
    setIsAdding(false);
  };

  const handleStartEdit = (product: DealProduct) => {
    setEditingId(product.id);
    editForm.reset({
      name: product.name,
      description: product.description || '',
      quantity: product.quantity,
      unit_price: product.unit_price,
    });
  };

  const handleSaveEdit = async (values: ProductFormValues) => {
    if (!editingId) return;
    await updateProduct.mutateAsync({
      id: editingId,
      name: values.name,
      description: values.description || null,
      quantity: values.quantity,
      unit_price: values.unit_price,
    });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    await deleteProduct.mutateAsync(id);
  };

  const handleSyncValue = () => {
    onValueChange?.(totalValue);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Produkty
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <Package className="h-5 w-5" />
          Produkty
        </CardTitle>
        {!isAdding && (
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)} className="gap-1">
            <Plus className="h-4 w-4" />
            Dodaj
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {products.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Brak produktów w tym deal
          </p>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Nazwa</TableHead>
                  <TableHead className="text-right w-[15%]">Ilość</TableHead>
                  <TableHead className="text-right w-[20%]">Cena jedn.</TableHead>
                  <TableHead className="text-right w-[20%]">Suma</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) =>
                  editingId === product.id ? (
                    <TableRow key={product.id}>
                      <TableCell colSpan={5} className="p-2">
                        <Form {...editForm}>
                          <form
                            onSubmit={editForm.handleSubmit(handleSaveEdit)}
                            className="flex items-center gap-2"
                          >
                            <FormField
                              control={editForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input placeholder="Nazwa" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="quantity"
                              render={({ field }) => (
                                <FormItem className="w-20">
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={editForm.control}
                              name="unit_price"
                              render={({ field }) => (
                                <FormItem className="w-28">
                                  <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="submit"
                              size="icon"
                              variant="ghost"
                              disabled={updateProduct.isPending}
                            >
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </form>
                        </Form>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.name}
                        {product.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {product.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(product.total_price)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleStartEdit(product)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Usunąć produkt?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Produkt "{product.name}" zostanie usunięty z deal.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Anuluj</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(product.id)}>
                                  Usuń
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                )}

                {/* Add Row */}
                {isAdding && (
                  <TableRow>
                    <TableCell colSpan={5} className="p-2">
                      <Form {...form}>
                        <form
                          onSubmit={form.handleSubmit(handleAdd)}
                          className="flex items-center gap-2"
                        >
                          <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem className="flex-1">
                                <FormControl>
                                  <Input placeholder="Nazwa produktu" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                              <FormItem className="w-20">
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Ilość" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="unit_price"
                            render={({ field }) => (
                              <FormItem className="w-28">
                                <FormControl>
                                  <Input type="number" step="0.01" placeholder="Cena" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            variant="ghost"
                            disabled={createProduct.isPending}
                          >
                            {createProduct.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 text-primary" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setIsAdding(false);
                              form.reset();
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </form>
                      </Form>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Footer with total */}
        {products.length > 0 && (
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              Razem: <span className="font-bold text-foreground">{formatCurrency(totalValue)}</span>
            </div>
            {onValueChange && (
              <Button variant="outline" size="sm" onClick={handleSyncValue}>
                Ustaw jako wartość deal
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
