import { SectionCard, SectionBox } from '../SectionCard';
import { Badge } from '@/components/ui/badge';
import { Package, Star, Wrench } from 'lucide-react';
import type { SectionProps, Product, Service } from '../types';

// Parse products from various formats
function parseProducts(products: any): Product[] {
  if (!products) return [];
  if (typeof products === 'string') return [{ name: products, description: '' }];
  if (Array.isArray(products)) {
    return products.map(p => {
      if (typeof p === 'string') return { name: p, description: '' };
      return p as Product;
    });
  }
  return [];
}

// Parse services from various formats
function parseServices(services: any): Service[] {
  if (!services) return [];
  if (typeof services === 'string') return [{ name: services, description: '' }];
  if (Array.isArray(services)) {
    return services.map(s => {
      if (typeof s === 'string') return { name: s, description: '' };
      return s as Service;
    });
  }
  return [];
}

export function ProductsServicesSection({ data }: SectionProps) {
  const products = parseProducts(data.products);
  const services = parseServices(data.services);
  const flagshipProducts = data.flagship_products || [];
  const mainProductsServices = data.main_products_services || [];
  const keyProjects = typeof data.key_projects === 'string' 
    ? [data.key_projects] 
    : data.key_projects || [];

  const hasData = products.length > 0 || services.length > 0 || 
    flagshipProducts.length > 0 || mainProductsServices.length > 0;

  if (!hasData) return null;

  return (
    <SectionCard
      icon={<Package className="h-4 w-4" />}
      title="Produkty i usługi"
    >
      <div className="space-y-4">
        {/* Flagship products highlight */}
        {flagshipProducts.length > 0 && (
          <SectionBox title="Flagowe produkty" icon={<Star className="h-3 w-3" />}>
            <div className="flex flex-wrap gap-1.5">
              {flagshipProducts.map((product, i) => (
                <Badge key={i} className="bg-primary/10 text-primary border-primary/20 text-xs">
                  ⭐ {product}
                </Badge>
              ))}
            </div>
          </SectionBox>
        )}

        {/* Products list */}
        {products.length > 0 && (
          <SectionBox title="Produkty" icon={<Package className="h-3 w-3" />}>
            <div className="space-y-2">
              {products.slice(0, 8).map((product, i) => (
                <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{product.name}</p>
                  {product.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{product.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {product.category && (
                      <Badge variant="outline" className="text-[10px]">{product.category}</Badge>
                    )}
                    {product.target_customer && (
                      <Badge variant="secondary" className="text-[10px]">→ {product.target_customer}</Badge>
                    )}
                    {product.price_range && (
                      <Badge variant="outline" className="text-[10px] text-green-600">{product.price_range}</Badge>
                    )}
                  </div>
                </div>
              ))}
              {products.length > 8 && (
                <p className="text-xs text-muted-foreground">...i {products.length - 8} więcej produktów</p>
              )}
            </div>
          </SectionBox>
        )}

        {/* Services list */}
        {services.length > 0 && (
          <SectionBox title="Usługi" icon={<Wrench className="h-3 w-3" />}>
            <div className="space-y-2">
              {services.slice(0, 6).map((service, i) => (
                <div key={i} className="p-2.5 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{service.name}</p>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{service.description}</p>
                  )}
                  {service.target && (
                    <p className="text-xs text-primary mt-1">→ {service.target}</p>
                  )}
                </div>
              ))}
              {services.length > 6 && (
                <p className="text-xs text-muted-foreground">...i {services.length - 6} więcej usług</p>
              )}
            </div>
          </SectionBox>
        )}

        {/* Legacy: main products/services */}
        {mainProductsServices.length > 0 && products.length === 0 && services.length === 0 && (
          <SectionBox title="Główne produkty/usługi">
            <ul className="space-y-1">
              {mainProductsServices.map((item, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}

        {/* Key projects */}
        {keyProjects.length > 0 && (
          <SectionBox title="Kluczowe projekty">
            <ul className="space-y-1">
              {keyProjects.map((project, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <span className="text-primary">•</span>
                  {project}
                </li>
              ))}
            </ul>
          </SectionBox>
        )}
      </div>
    </SectionCard>
  );
}
