
CREATE POLICY "Owners can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Owner')) WITH CHECK (public.has_role(auth.uid(), 'Owner'));
CREATE POLICY "Owners can update order items" ON public.order_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'Owner')) WITH CHECK (public.has_role(auth.uid(), 'Owner'));
CREATE POLICY "Owners can delete order items" ON public.order_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'Owner'));
