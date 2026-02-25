"use client"

import { useState } from "react"
import { CustomerTable } from "@/components/admin/customers/customer-table"
import { CustomerModal } from "@/components/admin/customers/customer-modal"
import { Customer } from "@/hooks/use-customers-store"

export default function CustomersPage() {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    const handleCreate = () => {
        setEditingCustomer(null)
        setIsModalOpen(true)
    }

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setIsModalOpen(true)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Clientes</h1>
                <p className="text-slate-500 text-sm mt-1">Gestiona tu base de clientes.</p>
            </div>

            <CustomerTable onCreate={handleCreate} onEdit={handleEdit} />

            <CustomerModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                customerToEdit={editingCustomer}
            />
        </div>
    )
}
