import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createSubject } from "src/api/subject";
import Title from "src/components/new/Title";
import Caption from "src/components/new/Caption";
import Name from "src/components/new/Name";
import Description from "src/components/new/Description";
import Close from "src/components/new/Close";
import Cancel from "src/components/new/Cancel";
import Create from "src/components/new/Create";
import { useState } from "react";

export default function New({
  title,
  caption,
  label,
  onClose,
}: {
  title: string;
  caption: string;
  label: string;
  description: string;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const queryClient = useQueryClient();

  const createSubjectMutation = useMutation({
    mutationFn: createSubject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      onClose();
    },
  });

  const handleCreate = () => {
    createSubjectMutation.mutate({ name });
  };
  return (
    <>
      <Title title={title} />
      <Caption caption={caption} />
      <Name label={label} value={name} onChange={setName} />
      <Description />
      <Close onClick={() => onClose()} />
      <Cancel onClick={() => onClose()} />
      <Create onClick={handleCreate} />
    </>
  );
}
